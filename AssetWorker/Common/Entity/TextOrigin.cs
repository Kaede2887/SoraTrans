using System;

namespace AssetWorker.Common.Entity
{
    public class TextOrigin
    {
        public long Id { get; set; }
        public long ObjectId { get; set; }
        public long PatternId { get; set; }
        public required string Text { get; set; }
        public required string FieldPath { get; set; }

        /// <summary>
        /// 从具体 FieldPath 提取结构 pattern：把数组索引 [数字] 归一化为 []，
        /// 使相同结构、不同索引的字段（如 m_Components[0].data.m_Text 与
        /// m_Components[1].data.m_Text）归到同一 pattern，便于把结构相似的文本分到一组。
        /// 例外：路径末尾本身是数组元素时保留其下标——中间各级下标只是行位置，
        /// 而末级下标通常承载语义（如 strings[1] 是标题、strings[2] 是描述），
        /// importGridList.Array[0].rows.Array[1].strings.Array[1] 与
        /// importGridList.Array[0].rows.Array[5].strings.Array[1] 归为一组，
        /// 但与 ...strings.Array[2] 不是一组。
        /// </summary>
        public static string ExtractPattern(string fieldPath)
        {
            if (string.IsNullOrEmpty(fieldPath)) return string.Empty;
            var trailing = TrailingIndexRegex().Match(fieldPath);
            if (!trailing.Success)
                return ArrayIndexRegex().Replace(fieldPath, "[]");
            return ArrayIndexRegex().Replace(fieldPath[..trailing.Index], "[]") + trailing.Value;
        }

        private static System.Text.RegularExpressions.Regex ArrayIndexRegex() => _arrayIndexRegex;
        private static readonly System.Text.RegularExpressions.Regex _arrayIndexRegex =
            new(@"\[\d+\]", System.Text.RegularExpressions.RegexOptions.Compiled);

        // 匹配路径末尾的数组下标（如 ...strings.Array[1] 的 [1]）
        private static System.Text.RegularExpressions.Regex TrailingIndexRegex() => _trailingIndexRegex;
        private static readonly System.Text.RegularExpressions.Regex _trailingIndexRegex =
            new(@"\[\d+\]$", System.Text.RegularExpressions.RegexOptions.Compiled);
    }
}
