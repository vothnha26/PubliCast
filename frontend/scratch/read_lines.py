with open(r'd:\Fullit\projects\PubliCast\frontend\src\pages\workspace\PostCreator.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i in range(1194, 1209):
    print(f"{i+1}: {repr(lines[i])}")
