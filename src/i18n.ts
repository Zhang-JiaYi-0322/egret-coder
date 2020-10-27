export { tr };

enum Language {
  zh = 'zh',
  en = 'en',
}

// 三级结构:
//  * 语言 language
//  * 上下文 context
//  * 翻译项 item pair
interface ITrDataEntry {
  [context: string]: { [id: string]: string };
}
interface ITrData {
  zh?: ITrDataEntry;
  en?: ITrDataEntry;
}

class I18nTexts {
  private readonly _textDict: Readonly<ITrData> = Object.freeze({
    'zh': {
      'Engine': {
        'Inner error happened': '发生了内部错误',
        'Please install Egret': '请安装最新版本的 Egret',
        'Please install Egret Launcher': '请安装最新版本的 Egret Launcher',
        'Inner error of Egret Launcher occurred': '请安装最新版本的 Egret Launcher',
        'Version of Egret Launcher should not be lower than {0}': 'Egret Launcher 的版本不能低于 {0}',
        'Go to download at official website：{0}': '前往官网下载：{0}',
      },
    },
  });
  private _textLanguage: Language = Language.zh;

  public set language(lang: Language) {
    this._textLanguage = lang;
  }
  public get language() {
    return this._textLanguage;
  }
  public tr(context: string, id: string, ...params: string[]): string {
    let text: string = id;
    const o = this._textDict[this.language];
    if (o) {
      const ctx = o[context];
      if (ctx) {
        text = ctx[id];
      }
    }
    text = text || id;
    text = text.replace(
      /\{(\d+)\}/g,
      (match, index) => (index < params.length ? params[index] : match)
    );
    return text;
  }
}

function getLanguage(): Language {
  const language = JSON.parse(process.env.VSCODE_NLS_CONFIG).locale;
  return (language === 'zh-cn' || language === 'zh-tw' || language === 'zh-CN' || language === 'zh-TW') ? Language.zh : Language.en;
}

let i18n: I18nTexts | undefined = (void 0);
function tr(context: string, id: string, ...params: string[]): string {
  i18n = i18n || new I18nTexts();
  i18n.language = getLanguage();
  return i18n.tr(context, id, ...params);
}
