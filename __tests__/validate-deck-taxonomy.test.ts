import {
  validateDeckTaxonomyFile,
  type PrebuiltDeckTaxonomyFile,
} from '@/lib/content';

function buildValidTaxonomy(): PrebuiltDeckTaxonomyFile {
  return {
    version: 2,
    decks: [
      {
        deck_id: 'deck_movies_tv',
        category: 'movies_tv',
        facets: [
          {
            id: 'movies_tv:tone',
            key: 'tone',
            label: 'Tone',
            description: 'Tone lanes',
          },
          {
            id: 'movies_tv:format',
            key: 'format',
            label: 'Format',
            description: 'Format lanes',
          },
          {
            id: 'movies_tv:lane',
            key: 'lane',
            label: 'Lane',
            description: 'Lane clusters',
          },
        ],
        tags: [
          {
            id: 'movies_tv:drama',
            facet_id: 'movies_tv:tone',
            slug: 'drama',
            label: 'Drama',
          },
          {
            id: 'movies_tv:comedy',
            facet_id: 'movies_tv:tone',
            slug: 'comedy',
            label: 'Comedy',
          },
          {
            id: 'movies_tv:horror',
            facet_id: 'movies_tv:tone',
            slug: 'horror',
            label: 'Horror',
          },
          {
            id: 'movies_tv:romance',
            facet_id: 'movies_tv:tone',
            slug: 'romance',
            label: 'Romance',
          },
          {
            id: 'movies_tv:binge',
            facet_id: 'movies_tv:format',
            slug: 'binge',
            label: 'Binge',
          },
          {
            id: 'movies_tv:cinema',
            facet_id: 'movies_tv:format',
            slug: 'cinema',
            label: 'Cinema',
          },
          {
            id: 'movies_tv:classic',
            facet_id: 'movies_tv:lane',
            slug: 'classic',
            label: 'Classic',
          },
          {
            id: 'movies_tv:action',
            facet_id: 'movies_tv:lane',
            slug: 'action',
            label: 'Action',
          },
        ],
      },
    ],
  };
}

describe('validateDeckTaxonomyFile', () => {
  it('accepts a well-formed taxonomy file', () => {
    const result = validateDeckTaxonomyFile(
      buildValidTaxonomy(),
      1700000000000,
    );

    expect(result.valid).toBe(true);
    if (!result.valid) {
      throw new Error('Expected valid taxonomy.');
    }

    expect(result.decks).toHaveLength(1);
    expect(result.decks[0].facets).toHaveLength(3);
    expect(result.decks[0].tags).toHaveLength(8);
    expect(result.decks[0].tagsById.has('movies_tv:drama')).toBe(true);
  });

  it('rejects duplicate slugs and missing facets', () => {
    const invalid = buildValidTaxonomy();
    invalid.decks[0].tags[1] = {
      id: 'movies_tv:comedy',
      facet_id: 'movies_tv:tone',
      slug: 'drama',
      label: 'Comedy',
    };
    invalid.decks[0].tags[2] = {
      id: 'movies_tv:horror',
      facet_id: 'movies_tv:missing',
      slug: 'horror',
      label: 'Horror',
    };

    const result = validateDeckTaxonomyFile(invalid, 1700000000000);

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error('Expected invalid taxonomy.');
    }

    expect(result.errors.join(' ')).toContain('missing facet');
    expect(result.errors.join(' ')).toContain('duplicated');
  });

  it('rejects decks that fall outside facet or tag count constraints', () => {
    const invalid: PrebuiltDeckTaxonomyFile = {
      version: 2,
      decks: [
        {
          deck_id: 'deck_values',
          category: 'values',
          facets: [
            { id: 'values:care', key: 'care', label: 'Care' },
            { id: 'values:order', key: 'order', label: 'Order' },
          ],
          tags: [
            {
              id: 'values:honesty',
              facet_id: 'values:care',
              slug: 'honesty',
              label: 'Honesty',
            },
            {
              id: 'values:justice',
              facet_id: 'values:care',
              slug: 'justice',
              label: 'Justice',
            },
          ],
        },
      ],
    };

    const result = validateDeckTaxonomyFile(invalid, 1700000000000);

    expect(result.valid).toBe(false);
    if (result.valid) {
      throw new Error('Expected invalid taxonomy.');
    }

    expect(result.errors.join(' ')).toContain('must define 3-6 facets');
    expect(result.errors.join(' ')).toContain('must define 8-20 tags');
  });
});
