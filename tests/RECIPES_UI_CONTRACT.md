# Recipes UI Contract — current V3

- Recipe list/detail are read surfaces.
- Detail has exactly one Recipe edit entry point.
- Detail does not mutate ingredients directly.
- Recipe authoring owns metadata, cover/crop, ingredients and preparation.
- Zero ingredients does not create an educational intermediate screen.
- Empty-state and primary actions use normal household language.
- Start does not duplicate the Recipes module navigation.
