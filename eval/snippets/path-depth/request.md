When more than one key path shares the maximum depth, return the path that is
alphabetically first (ordinary string comparison of the dotted path) instead of
the one encountered first during the walk. The notion of depth (number of dotted
segments), descending only into plain objects, treating arrays and other values
as leaves, and returning the empty string for an empty object must all be
unchanged.
