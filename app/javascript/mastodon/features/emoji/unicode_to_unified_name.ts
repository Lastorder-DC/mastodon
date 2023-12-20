function padLeft(str: string, num: number) {
  while (str.length < num) {
    str = '0' + str;
  }

  return str;
}

export const unicodeToUnifiedName = (str: string) => {
  let output = '';

  for (let i = 0; i < str.length; i += 2) {
    if (i > 0) {
      output += '-';
    }

    output += padLeft((str.codePointAt(i) ?? 0).toString(16).toUpperCase(), 4);
  }

  return output;
};
