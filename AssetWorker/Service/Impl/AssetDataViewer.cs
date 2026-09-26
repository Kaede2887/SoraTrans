using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using AssetsTools.NET;
using AssetsTools.NET.Extra;
using AssetWorker.Common.Entity;

namespace AssetWorker.Service.Impl
{
    /// <summary>
    /// 树节点流式事件：后端以深度优先顺序产出扁平节点，前端按 Id/ParentId 增量挂载。
    /// Type: "root"（整棵树的根，Id 恒为 0）、"node"（普通节点）、"error"（致命错误，仅一条）。
    /// 载荷只携带渲染所需的 Segments，不再传完整节点对象。
    /// </summary>
    public record TreeViewStreamEvent(string Type, long Id, long? ParentId, List<Segment>? Segments);

    public class AssetDataViewer(AssetsManager assetsManager)
    {
        private readonly AssetsManager manager = assetsManager;

        /// <summary>
        /// 流式加载组件树：根节点先发出（首包快），之后每解析出一个节点立即 yield，
        /// 不再一次性构建整棵树，避免大数组/深层结构时长时间无响应和整树驻留内存。
        /// 约定：root 事件 Id = 0；node 事件 Id 从 1 递增，ParentId 指向已发出的父节点。
        /// </summary>
        public IEnumerable<TreeViewStreamEvent> LoadComponent(AssetsFileInstance fileInst, long id)
        {
            if (manager == null)
            {
                yield return new TreeViewStreamEvent("error", -1, null, TextSegments("Manager has not initialized"));
                yield break;
            }

            var assetFile = fileInst.file;
            manager.LoadClassDatabaseFromPackage(assetFile.Metadata.UnityVersion);
            AssetFileInfo info = assetFile.GetAssetInfo(id);
            var fileReader = assetFile.Reader;
            var absByteOffset = info.GetAbsoluteByteOffset(assetFile);
            var scriptIndex = info.GetScriptIndex(assetFile);

            AssetTypeTemplateField? baseField = manager.GetTemplateBaseField(fileInst, fileReader, absByteOffset, info.TypeId, scriptIndex, AssetReadFlags.None);
            AssetTypeValueField goBase = manager.GetBaseField(fileInst, info);

            if (baseField == null)
            {
                yield return new TreeViewStreamEvent("root", 0, null, TextSegments("Asset failed to deserialize."));
                long errSeq = 1;
                yield return new TreeViewStreamEvent("node", errSeq++, 0, TextSegments("The file version may be too new for"));
                yield return new TreeViewStreamEvent("node", errSeq, 0, TextSegments("this tpk or the file format is custom."));
                yield break;
            }

            string baseItemString = $"{baseField.Type} {baseField.Name}";

            string monoName = GetMonoBehaviourName(info, goBase);
            if (monoName != string.Empty)
            {
                baseItemString += $" ({monoName})";
            }

            yield return new TreeViewStreamEvent("root", 0, null, TextSegments(baseItemString));

            // 普通节点 id 从 1 开始；迭代器局部函数闭包共享该计数器（单次枚举单线程使用）
            long nextId = 1;
            foreach (var evt in StreamFieldChildren(goBase, 0))
            {
                yield return evt;
            }

            // 深度优先遍历 assetField 的子节点并以扁平事件产出，全部挂载到 parentId 下
            IEnumerable<TreeViewStreamEvent> StreamFieldChildren(AssetTypeValueField assetField, long parentId)
            {
                List<AssetTypeValueField> children;
                if (assetField.Value != null && assetField.Value.ValueType == AssetValueType.ManagedReferencesRegistry)
                    children = assetField.AsManagedReferencesRegistry.references.Select(r => r.data).ToList();
                else
                    children = assetField.Children;

                if (children.Count == 0)
                {
                    yield break;
                }

                AssetTypeTemplateField assetFieldTemplate = assetField.TemplateField;
                bool isArray = assetFieldTemplate.IsArray;

                if (isArray)
                {
                    int size = assetField.AsArray.size;
                    AssetTypeTemplateField sizeTemplate = assetFieldTemplate.Children[0];
                    yield return Emit(parentId,
                        TypeSegments(sizeTemplate.Type, sizeTemplate.Name, " = ", size.ToString()));
                }
                

                int arrayIdx = 0;
                foreach (AssetTypeValueField childField in children)
                {
                    if (childField == null) continue;
                    string middle = "";
                    string value = "";
                    if (childField.Value != null)
                    {
                        AssetValueType evt = childField.Value.ValueType;
                        string quote = "";
                        if (evt == AssetValueType.String) quote = "\"";
                        if (1 <= (int)evt && (int)evt <= 12)
                        {
                            middle = " = ";
                            value = $"{quote}{childField.AsString}{quote}";
                        }
                        if (evt == AssetValueType.Array)
                        {
                            middle = $" (size {childField.Children.Count})";
                        }
                        else if (evt == AssetValueType.ByteArray)
                        {
                            byte[] bytes = childField.AsByteArray;
                            int byteArraySize = childField.AsByteArray.Length;
                            middle = $" (size {byteArraySize}) = ";

                            const int MAX_PREVIEW_BYTES = 20;
                            int previewSize = Math.Min(byteArraySize, MAX_PREVIEW_BYTES);

                            StringBuilder valueBuilder = new();
                            for (int i = 0; i < previewSize; i++)
                            {
                                if (i == 0)
                                {
                                    valueBuilder.Append(bytes[i].ToString("X2"));
                                }
                                else
                                {
                                    valueBuilder.Append(" " + bytes[i].ToString("X2"));
                                }
                            }

                            if (byteArraySize > MAX_PREVIEW_BYTES)
                            {
                                valueBuilder.Append(" ...");
                            }

                            value = valueBuilder.ToString();
                        }
                    }

                    bool hasChildren = childField.Children.Count > 0;

                    if (isArray)
                    {
                        // 原逻辑：每个数组元素包一层下标节点（"0"/"1"...），下标节点下再挂真实字段节点
                        long indexNodeId = EmitId();
                        yield return new TreeViewStreamEvent("node", indexNodeId, parentId, TextSegments($"{arrayIdx}"));

                        long childNodeId = EmitId();
                        yield return new TreeViewStreamEvent("node", childNodeId, indexNodeId,
                            TypeSegments(childField.TypeName, childField.FieldName, middle, value));

                        if (hasChildren)
                        {
                            foreach (var descendant in StreamFieldChildren(childField, childNodeId))
                                yield return descendant;
                        }

                        arrayIdx++;
                    }
                    else
                    {
                        long childNodeId = EmitId();
                        yield return new TreeViewStreamEvent("node", childNodeId, parentId,
                            TypeSegments(childField.TypeName, childField.FieldName, middle, value));

                        if (childField.Value != null && childField.Value.ValueType == AssetValueType.ManagedReferencesRegistry)
                        {
                            ManagedReferencesRegistry registry = childField.AsManagedReferencesRegistry;

                            if (registry.version == 1 || registry.version == 2)
                            {
                                long versionNodeId = EmitId();
                                yield return new TreeViewStreamEvent("node", versionNodeId, childNodeId,
                                    TypeSegments("int", "version", " = ", registry.version.ToString()));

                                long refIdsNodeId = EmitId();
                                yield return new TreeViewStreamEvent("node", refIdsNodeId, childNodeId,
                                    TypeSegments("vector", "RefIds"));

                                long refIdsArrayNodeId = EmitId();
                                yield return new TreeViewStreamEvent("node", refIdsArrayNodeId, refIdsNodeId,
                                    TypeSegments("Array", "Array", $" (size {registry.references.Count})", ""));

                                foreach (AssetTypeReferencedObject refObj in registry.references)
                                {
                                    AssetTypeReference typeRef = refObj.type;

                                    long refObjNodeId = EmitId();
                                    yield return new TreeViewStreamEvent("node", refObjNodeId, refIdsArrayNodeId,
                                        TypeSegments("ReferencedObject", "data"));

                                    if (registry.version == 2)
                                    {
                                        long ridNodeId = EmitId();
                                        yield return new TreeViewStreamEvent("node", ridNodeId, refObjNodeId,
                                            TypeSegments("SInt64", "rid", " = ", refObj.rid.ToString()));
                                    }

                                    long managedTypeNodeId = EmitId();
                                    yield return new TreeViewStreamEvent("node", managedTypeNodeId, refObjNodeId,
                                        TypeSegments("ReferencedManagedType", "type"));
                                    foreach (var typeNode in StreamTypeNodes(managedTypeNodeId, typeRef))
                                        yield return typeNode;

                                    long refObjectNodeId = EmitId();
                                    yield return new TreeViewStreamEvent("node", refObjectNodeId, refObjNodeId,
                                        TypeSegments("ReferencedObjectData", "data"));
                                    foreach (var dataNode in StreamFieldChildren(refObj.data, refObjectNodeId))
                                        yield return dataNode;
                                }
                            }
                            else
                            {
                                yield return new TreeViewStreamEvent("node", EmitId(), childNodeId,
                                    TextSegments($"[unsupported registry version {registry.version}]"));
                            }
                        }
                        else if (hasChildren)
                        {
                            foreach (var descendant in StreamFieldChildren(childField, childNodeId))
                                yield return descendant;
                        }
                    }
                }

                // class/ns/asm 三个叶子节点
                IEnumerable<TreeViewStreamEvent> StreamTypeNodes(long typeParentId, AssetTypeReference typeRef)
                {
                    yield return new TreeViewStreamEvent("node", EmitId(), typeParentId,
                        TypeSegments("string", "class", " = ", $"\"{typeRef.ClassName}\""));
                    yield return new TreeViewStreamEvent("node", EmitId(), typeParentId,
                        TypeSegments("string", "ns", " = ", $"\"{typeRef.Namespace}\""));
                    yield return new TreeViewStreamEvent("node", EmitId(), typeParentId,
                        TypeSegments("string", "asm", " = ", $"\"{typeRef.AsmName}\""));
                }
            }

            long EmitId() => nextId++;

            TreeViewStreamEvent Emit(long pId, List<Segment> segments)
                => new("node", EmitId(), pId, segments);
        }

        /// <summary>构造类型字段节点的渲染片段：类型名 + 字段名 + 连接符 + 值（可空）。</summary>
        private List<Segment> TypeSegments(string typeName, string fieldName, string middle, string value)
        {
            bool isString = value.StartsWith("\"");
            bool primitiveType = AssetTypeValueField.GetValueTypeByTypeName(typeName) != AssetValueType.None;

            List<Segment> segs = new(4)
            {
                new() { K = primitiveType ? "type-primitive" : "type-complex", T = typeName },
                new() { K = "field", T = " " + fieldName },
            };

            if (middle != string.Empty)
            {
                segs.Add(new() { K = "middle", T = middle });
            }

            if (value != string.Empty)
            {
                segs.Add(new() { K = isString ? "string" : "value", T = value });
            }

            return segs;
        }

        private List<Segment> TypeSegments(string typeName, string fieldName)
            => TypeSegments(typeName, fieldName, string.Empty, string.Empty);

        /// <summary>构造纯文本节点（根标题、数组下标、错误提示）的渲染片段。</summary>
        private List<Segment> TextSegments(string text)
            => new() { new() { K = "text", T = text } };

        private string GetMonoBehaviourName(AssetFileInfo info, AssetTypeValueField scriptBaseField)
        {
            try
            {
                if (info.TypeId != (uint)AssetClassID.MonoBehaviour && info.TypeId >= 0){
                    return string.Empty;
                }
                string scriptClassName = scriptBaseField["m_ClassName"].AsString;
                return scriptClassName;
            }
            catch
            {
                return string.Empty;
            }

        }
    }


}
