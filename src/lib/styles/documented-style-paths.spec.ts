import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A stylesheet the documentation tells consumers to import must resolve by that exact path.
 *
 * `exports` is a closed door: once a package declares one, every subpath it does not list stops
 * resolving, so `@use 'ng-hub-ui-utils/styles/tooltip'` dies with a resolution error in the
 * consumer's build. Nothing on this side notices — the file is still compiled, still copied to
 * `dist` — which is why the promise and the manifest can drift apart for a whole release.
 *
 * The documentation is the source here rather than a hand-kept list, so a path added to a README
 * tomorrow is covered without anyone remembering to add it. `CHANGELOG.md` and
 * `BREAKING_CHANGES.md` are left out on purpose: they record what was true at the time, and a
 * path they mention may have been removed since.
 */
const PACKAGE_ROOT = 'projects/utils';

/** Documents that record history rather than instruct, so a path they name need not still exist. */
const HISTORICAL_DOCUMENTS = ['CHANGELOG.md', 'BREAKING_CHANGES.md'];

/** Where the stylesheets live in source, and where `ng-package.json` is told to copy them. */
const STYLES_SOURCE = join(PACKAGE_ROOT, 'src/lib/styles');

/** Every markdown file a consumer may follow, anywhere under the package. */
const instructionalDocuments = (directory: string): string[] =>
	readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const full = join(directory, entry.name);

		if (entry.isDirectory()) {
			return entry.name === 'node_modules' ? [] : instructionalDocuments(full);
		}

		return entry.name.endsWith('.md') && !HISTORICAL_DOCUMENTS.includes(entry.name) ? [full] : [];
	});

/** Each `ng-hub-ui-utils/styles/…` subpath the documentation hands to a consumer, with its source. */
const documentedSubpaths = (): { document: string; subpath: string }[] =>
	instructionalDocuments(PACKAGE_ROOT).flatMap((document) => {
		const matches = readFileSync(document, 'utf8').matchAll(/ng-hub-ui-utils(\/styles\/[\w.-]+)/g);

		return [...matches].map((match) => ({ document, subpath: match[1] }));
	});

/** The manifest as published, whose `exports` map is what a bundler actually reads. */
const manifest = (): { exports?: Record<string, string> } =>
	JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));

/** The asset rules `ng-packagr` copies verbatim into `dist`. */
const assetRules = (): { input: string; output: string }[] =>
	JSON.parse(readFileSync(join(PACKAGE_ROOT, 'ng-package.json'), 'utf8')).assets ?? [];

describe('the stylesheet paths ng-hub-ui-utils documents', () => {
	it('finds documented stylesheet paths at all, so an empty list cannot pass as a clean bill', () => {
		expect(documentedSubpaths().length).toBeGreaterThan(0);
	});

	it('are all listed in the package exports, which is the only door a consumer can come through', () => {
		const map = manifest().exports ?? {};

		const offenders = documentedSubpaths()
			.filter(({ subpath }) => !map[`.${subpath}`])
			.map(({ document, subpath }) => `${document} imports ng-hub-ui-utils${subpath}, unexported`);

		expect([...new Set(offenders)]).toEqual([]);
	});

	it('point at a stylesheet that exists in source', () => {
		const map = manifest().exports ?? {};

		const offenders = Object.entries(map)
			.filter(([subpath]) => subpath.startsWith('./styles/'))
			.filter(([, target]) => !existsSync(join(STYLES_SOURCE, target.replace('./styles/', ''))))
			.map(([subpath, target]) => `${subpath} resolves to ${target}, which is not in ${STYLES_SOURCE}`);

		expect(offenders).toEqual([]);
	});

	it('are copied into the built package, so the export resolves to a file and not to a hole', () => {
		const copiesStyles = assetRules().some((rule) => rule.input === 'src/lib/styles' && rule.output === 'styles');

		expect(copiesStyles).toBe(true);
	});
});
