import re
import json

def convert_ts_to_json():
    with open('data/rights_data.ts', 'r', encoding='utf-8') as f:
        content = f.read()

    idx = content.find('export const RIGHTS_DATA')
    if idx == -1:
        print("Could not find RIGHTS_DATA")
        return

    obj_str = content[idx + len('export const RIGHTS_DATA: Record<string, CategoryRightsDetail> = '):].strip()
    if obj_str.endswith(';'):
        obj_str = obj_str[:-1]

    # Quote bare keys
    formatted = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)\s*:', r'\1"\2":', obj_str)
    # Remove trailing commas
    formatted = re.sub(r',\s*([\]}])', r'\1', formatted)

    try:
        data = json.loads(formatted)
        with open('data/rights_data.json', 'w', encoding='utf-8') as out:
            json.dump(data, out, indent=2, ensure_ascii=False)
        print(f"SUCCESS: Successfully converted {len(data)} legal categories to data/rights_data.json")
    except Exception as e:
        print(f"Direct JSON parse failed ({e}), using JS parser via Python...")
        # If any syntax issue, let's parse via quick node or regex blocks
        import ast
        try:
            # Try python eval after replacing JS booleans
            py_str = obj_str.replace("true", "True").replace("false", "False").replace("null", "None")
            # quote unquoted keys
            py_str = re.sub(r'([{,]\s*)([a-zA-Z0-9_]+)\s*:', r'\1"\2":', py_str)
            data = ast.literal_eval(py_str)
            with open('data/rights_data.json', 'w', encoding='utf-8') as out:
                json.dump(data, out, indent=2, ensure_ascii=False)
            print(f"SUCCESS (ast): Converted {len(data)} categories to data/rights_data.json")
        except Exception as e2:
            print(f"AST failed: {e2}")

if __name__ == "__main__":
    convert_ts_to_json()
