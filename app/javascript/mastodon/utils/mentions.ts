const MENTION_SEPARATORS = '_\\u00b7\\u200c';
const ALPHA = '\\p{L}\\p{M}';
const WORD = '\\p{L}\\p{M}\\p{N}\\p{Pc}';

const buildMentionPatternRegex = () => {
  try {
    return new RegExp(
      `(?:^|[^\\/\\)\\w])@(([${WORD}_][${WORD}${MENTION_SEPARATORS}]*[${ALPHA}${MENTION_SEPARATORS}][${WORD}${MENTION_SEPARATORS}]*[${WORD}_])|([${WORD}_]*[${ALPHA}][${WORD}_]*))`,
      'iu',
    );
  } catch {
    return /(?:^|[^/)\w])#(\w*[a-zA-Z·]\w*)/i;
  }
};

const buildMentionRegex = () => {
  try {
    return new RegExp(
      `^(([${WORD}_][${WORD}${MENTION_SEPARATORS}]*[${ALPHA}${MENTION_SEPARATORS}][${WORD}${MENTION_SEPARATORS}]*[${WORD}_])|([${WORD}_]*[${ALPHA}][${WORD}_]*))$`,
      'iu',
    );
  } catch {
    return /^(\w*[a-zA-Z·]\w*)$/i;
  }
};

export const MENTION_PATTERN_REGEX = buildMentionPatternRegex();

export const MENTION_REGEX = buildMentionRegex();
