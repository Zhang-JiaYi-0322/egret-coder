/**
 * 字符串工具类
 * @author featherJ
 */
export class StringUtil {
  /**
   * 是否以指定的字符串结束
   */
  public static endWith(str: string, suffix: string): boolean {
    if (!str) { return (str === suffix); }

    return str.endsWith(suffix);
  }

  /**
   * 指定的字符是否是白空格
   * @param char 要判断的字符
   */
  public static isWhitespace(char: string): boolean {
    return [' ', '\t', '\n', '\r', '\f'].indexOf(char) >= 0;
  }

  /**
   * 检查指定的索引是否在字符串中
   * @param text 全文
   * @param index 指定索引
   */
  public static checkInString(text: string, index: number): Boolean {
    if (!text || index < 0 || index >= text.length) { return false; }

    let newStr: string = text.slice(0, index);
    for (let i: number = index - 1; i >= 0; i--) {
      if (text.charAt(i) === '\r' || text.charAt(i) === '\n') {
        newStr = newStr.slice(i + 1);
        break;
      }
    }
    let inDoubleQuote: Boolean = false;
    let inSingleQuote: Boolean = false;
    for (let i = 0; i < newStr.length; i++) {
      if (newStr.charAt(i) === '"' && (i === 0 || newStr.charAt(i - 1) !== '\\')) {
        if (!inDoubleQuote && !inSingleQuote) {
          inDoubleQuote = true;
        } else if (inDoubleQuote) {
          inDoubleQuote = false;
        }
      }
      if (newStr.charAt(i) === '\'' && (i === 0 || newStr.charAt(i - 1) !== '\\')) {
        if (!inDoubleQuote && !inSingleQuote) {
          inSingleQuote = true;
        } else if (inSingleQuote) {
          inSingleQuote = false;
        }
      }
    }
    return (inDoubleQuote && text.charAt(index) !== '"') || (inSingleQuote && text.charAt(index) !== "\'");
  }

  /**
   * 去掉字符串两端所有连续的不可见字符。
   * @param str 要格式化的字符串
   */
  public static trim(str: string): string {
    if (!str) { return ''; }
    return str.trim();
  }
  /**
   * 去除字符串左边所有连续的不可见字符。
   * @param str 要格式化的字符串
   */
  public static trimLeft(str: string): string {
    if (!str) { return ''; }

    const len = str.length;
    for (let i = 0; i < len; i++) {
      if (!this.isWhitespace(str.charAt(i))) {
        return str.slice(i);
      }
    }
    return '';
  }
  /**
   * 去除字符串右边所有连续的不可见字符。
   * @param str 要格式化的字符串
   */
  public static trimRight(str: string, needle: string = null): string {
    if (!str) { return ''; }

    const len = str.length;
    for (let i = len - 1; i >= 0; i--) {
      if (!this.isWhitespace(str.charAt(i))) {
        return str.slice(0, i + 1);
      }
    }
    return '';
  }
}