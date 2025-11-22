import os
import json

SKIP_KEYS = ["activities", "effects"]
def update_name_fields(obj, parent_key=None, parent_keys=None):
    """递归遍历JSON对象，更新name字段"""
    # 初始化parent_keys列表
    if parent_keys is None:
        parent_keys = []
    
    # 如果有新的parent_key，添加到parent_keys列表中
    if parent_key:
        current_parent_keys = parent_keys + [parent_key]
    else:
        current_parent_keys = parent_keys.copy()
    
    if isinstance(obj, dict):
        for key, value in obj.items():
            # 如果当前键是"name"且值是字符串，检查是否需要更新
            if key == "name" and isinstance(value, str) and parent_key:
                # 检查是否有任何上级key包含"activites"或"effect"
                should_skip = any(skip_key in pk for skip_key in SKIP_KEYS for pk in current_parent_keys)
                if not should_skip and parent_key not in value:
                    obj[key] = f"{value} {parent_key}"
            # 递归处理嵌套对象
            elif isinstance(value, (dict, list)):
                update_name_fields(value, key, current_parent_keys)
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, (dict, list)):
                update_name_fields(item, parent_key, current_parent_keys)

def process_json_files(root_dir):
    """遍历目录下所有JSON文件并处理"""
    for subdir, _, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(subdir, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # 处理JSON数据
                    update_name_fields(data)
                    
                    # 写到/translation/cn-with-english目录（与cn目录同级）
                    # 获取translation目录路径
                    translation_dir = os.path.dirname(root_dir)
                    translate_dir = os.path.join(translation_dir, "cn-with-english")
                    os.makedirs(translate_dir, exist_ok=True)
                    translate_file_path = os.path.join(translate_dir, file)
                    with open(translate_file_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    
                    print(f"已处理文件: {file_path} -> {translate_file_path}")
                except Exception as e:
                    print(f"处理文件时出错 {file_path}: {e}")

if __name__ == "__main__":
    # 设置根目录 - 使用相对路径而不是绝对路径
    # 获取脚本所在目录
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # 构建相对于脚本的翻译目录路径
    root_dir = os.path.join(script_dir, "dnd-simplified-chinese-babele-patch", "translation", "cn")
    
    print(f"开始处理目录: {root_dir}")
    process_json_files(root_dir)
    print("所有文件处理完成！")