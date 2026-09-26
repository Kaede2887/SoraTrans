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
        /// </summary>
        public static string ExtractPattern(string fieldPath)
        {
            if (string.IsNullOrEmpty(fieldPath)) return string.Empty;
            return ArrayIndexRegex().Replace(fieldPath, "[]");
        }

        private static System.Text.RegularExpressions.Regex ArrayIndexRegex() => _arrayIndexRegex;
        private static readonly System.Text.RegularExpressions.Regex _arrayIndexRegex =
            new(@"\[\d+\]", System.Text.RegularExpressions.RegexOptions.Compiled);
    }
}
