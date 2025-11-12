import os
import json

def update_name_fields(obj, parent_key=None):
    """递归遍历JSON对象，更新name字段"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            # 如果当前键是"name"且值是字符串，就更新它
            if key == "name" and isinstance(value, str) and parent_key:
                obj[key] = f"{value} {parent_key}"
            # 递归处理嵌套对象
            elif isinstance(value, (dict, list)):
                update_name_fields(value, key)
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, (dict, list)):
                update_name_fields(item, parent_key)

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
                    
                    # 写到/translate/cn-with-english目录
                    translate_dir = os.path.join(os.path.dirname(file_path), "cn-with-english")
                    os.makedirs(translate_dir, exist_ok=True)
                    translate_file_path = os.path.join(translate_dir, file)
                    with open(translate_file_path, 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    
                    print(f"已处理文件: {file_path}")
                except Exception as e:
                    print(f"处理文件时出错 {file_path}: {e}")

if __name__ == "__main__":
    # 设置根目录
    root_dir = "/data/dnd-simplified-chinese-babele-patch/dnd-simplified-chinese-babele-patch/translation/cn"
    
    print(f"开始处理目录: {root_dir}")
    process_json_files(root_dir)
    print("所有文件处理完成！")