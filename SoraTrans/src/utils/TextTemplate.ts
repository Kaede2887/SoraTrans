// 长文本"再提取"：按源语言选择正则，把【需要翻译的日文片段】挖出来替换为
// {0}/{1} 占位符，数字、标点、// 注释、编号等结构原样保留在模板中。
// 模板存进 text_origin.text_template；导出 JSON 时长文本拆成扁平条目
// "id:{0}": "日文片段"，供翻译人员逐段翻译后回填。

// 超过该长度（字符数）的 origin_text 才触发再提取
export const LONG_TEXT_THRESHOLD = 100;

// 目前只接入日语；后续新增语言时在此追加正则即可
export type TemplateLanguage = "ja";

// 连续的日文块：平假名/片假名（含半角片假名）、CJK 汉字（含扩展A）、
// CJK 标点（。、「」々 等）、全角符号（！？：（）等）
const JP_SEGMENT_PATTERN =
    /[぀-ヿ㐀-䶿一-鿿　-〿＀-￯]+/g;

// 判断块内是否真的含日文"文字"（假名/汉字），
// 纯全角标点块（如孤立的「・」「！」）不提取
const JP_CHAR_PATTERN = /[぀-ヿ㐀-䶿一-鿿]/;

const LANGUAGE_PATTERNS: Record<TemplateLanguage, RegExp> = {
    ja: JP_SEGMENT_PATTERN,
};

export interface TextTemplateExtractResult {
    // 日文片段被替换为占位符后的模板，如：0:{0},,// 8:{1},,
    template: string;
    // 占位符 -> 被挖出的日文片段，长文本条目导出时直接作为该条目的值
    placeholders: Record<string, string>;
}

/**
 * 用指定语言的正则把原文中的待翻译片段替换为占位符。
 * 占位符按首次出现顺序编号；相同片段复用同一占位符，
 * 保证同一条原文重复导出时结果稳定一致。
 */
export function extractTextTemplate(
    origin: string,
    language: TemplateLanguage = "ja"
): TextTemplateExtractResult {
    const pattern = LANGUAGE_PATTERNS[language];
    const regex = new RegExp(pattern.source, pattern.flags);
    const tokenByContent = new Map<string, string>();
    let index = 0;

    const template = origin.replace(regex, (matched) => {
        // 纯标点/全角符号块不含假名或汉字，不视为待翻译内容
        if (!JP_CHAR_PATTERN.test(matched)) {
            return matched;
        }
        let token = tokenByContent.get(matched);
        if (token === undefined) {
            token = `{${index++}}`;
            tokenByContent.set(matched, token);
        }
        return token;
    });

    const placeholders: Record<string, string> = {};
    for (const [content, token] of tokenByContent) {
        placeholders[token] = content;
    }

    return { template, placeholders };
}
