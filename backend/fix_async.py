import ast
import glob
import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        source = f.read()
    
    tree = ast.parse(source)
    
    to_replace = []
    for node in tree.body:
        if isinstance(node, ast.AsyncFunctionDef):
            has_await = False
            for child in ast.walk(node):
                if isinstance(child, ast.Await) or isinstance(child, ast.AsyncFor) or isinstance(child, ast.AsyncWith):
                    has_await = True
                    break
            if not has_await:
                to_replace.append(node.name)
    
    if not to_replace:
        print(f"No changes needed for {filepath}")
        return
    
    for name in to_replace:
        print(f"Replacing async def -> def for {name} in {filepath}")
        source = re.sub(rf'^[ \t]*async\s+def\s+{name}\b', f'def {name}', source, flags=re.MULTILINE)
    
    with open(filepath, 'w') as f:
        f.write(source)

for fpath in glob.glob("app/api/v1/endpoints/*.py"):
    fix_file(fpath)
fix_file("app/main.py")
