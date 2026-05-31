Drop the common stop-words "a", "the", "of", and "and" from the list of words
before the maxWords cap is applied. The comparison is against the already
lowercased, alphanumeric-only form of each word. Removing stop-words happens
before slicing to maxWords, so non-stop-words that previously fell outside the cap
may now be included. All other behavior (lowercasing, stripping non-alphanumeric
characters, dropping empty words, joining with hyphens) must be unchanged.
