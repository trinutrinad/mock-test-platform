# Quick Reference: How to Fix CSV Encoding - Step-by-Step

## 🚀 Quickest Fix (60 seconds)

### Using PowerShell (Automatic)

**Step 1:** Open PowerShell in your project folder
```powershell
# Navigate to your project
cd "E:\Projects\mock-test-platform-main"

# Run the auto-fixer
.\fix-csv-encoding.ps1
```

Done! File is fixed. ✅

---

## 📋 Alternative Methods

### Method 1: Notepad++ (Recommended - Visual)

1. **Download Notepad++** (if not installed): https://notepad-plus-plus.org/
2. **Open file**:
   - Notepad++ → File → Open
   - Select `APPSC_Group2_Practice_Test_150Q.csv`
3. **Check encoding** (Bottom right of screen):
   - See current encoding (e.g., "CP-1252", "ANSI", etc.)
4. **Convert to UTF-8**:
   - Click: `Encoding` (top menu)
   - Select: `Encode in UTF-8` (NOT "Encode in UTF-8 without BOM")
   - Wait - file updates
5. **Save**:
   - Ctrl+S or File → Save
6. **Verify**:
   - Bottom right now shows: `UTF-8`
   - File is ready for upload!

**Time: ~30 seconds**

---

### Method 2: Microsoft Excel (Official Way)

1. **Open CSV in Excel**:
   - Right-click file → Open with → Excel
   - Or: Excel → File → Open

2. **Check data**:
   - If Telugu text looks like "à°" instead of "ఆ", this confirms encoding issue
   - Proceed to save fix

3. **Save in correct format**:
   - Click: `File` (top left)
   - Click: `Save As`
   - **Format dropdown**: Select **`CSV UTF-8 (Comma delimited) (*.csv)`**
   - ⚠️ **NOT** "CSV (Comma delimited)" - that's ANSI!
   - Click: `Save`
   - If prompted "Do you want to keep the file in CSV UTF-8?", click: `Yes`

4. **Close Excel**

5. **Done!** File is now UTF-8. Upload to your platform.

**Time: ~45 seconds**

---

### Method 3: VS Code (Free, Built-in)

1. **Open VS Code**:
   - File → Open Folder → Select your project folder
   - Or drag folder into VS Code

2. **Open the CSV**:
   - Left side file explorer → APPSC_Group2_Practice_Test_150Q.csv
   - Click to open

3. **Check encoding** (Bottom right):
   - Click on encoding dropdown (shows current encoding)
   - Select: `UTF-8`
   - VS Code re-interprets the file
   - Should see Telugu text better now

4. **Save**:
   - Ctrl+S
   - Done!

**Time: ~20 seconds**

---

### Method 4: Python (Most Reliable for Bulk Convert)

Create a file called `convert_csv.py`:

```python
#!/usr/bin/env python3
"""
CSV Encoding Fixer - Converts CSV from any encoding to UTF-8
"""

import sys
from pathlib import Path

# Try different source encodings (most to least likely)
source_encodings = ['utf-8', 'iso-8859-1', 'cp1252', 'windows-1252', 'latin-1']

csv_file = Path('APPSC_Group2_Practice_Test_150Q.csv').resolve()

if not csv_file.exists():
    print(f"❌ File not found: {csv_file}")
    sys.exit(1)

print(f"🔄 Converting: {csv_file.name}")

# Read with any available encoding
content = None
used_encoding = None

for encoding in source_encodings:
    try:
        with open(csv_file, 'r', encoding=encoding) as f:
            content = f.read()
        used_encoding = encoding
        print(f"✓ Read as: {encoding}")
        break
    except (UnicodeDecodeError, LookupError):
        continue

if content is None:
    print("❌ Could not read file with any known encoding")
    sys.exit(1)

# Write as UTF-8 (no BOM)
with open(csv_file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✓ Saved as: UTF-8 (no BOM)")

# Verify
line_count = len(content.split('\n'))
print(f"✓ Total lines: {line_count}")
print(f"\n✅ SUCCESS! File is now UTF-8 encoded.")
print(f"📤 Ready to upload to your platform.\n")
```

**Run it:**
```bash
python convert_csv.py
```

**Time: ~10 seconds**

---

### Method 5: Google Sheets (Cloud-based)

1. **Open Google Drive**: https://drive.google.com

2. **Upload CSV**:
   - Click: `+ New` (left side)
   - File Upload
   - Select: `APPSC_Group2_Practice_Test_150Q.csv`
   - Wait for upload

3. **Open in Google Sheets**:
   - Right-click uploaded file
   - Open with → Google Sheets

4. **Download correctly**:
   - File → Download → CSV UTF-8 (.csv)
   - Your browser downloads the UTF-8 corrected version

5. **Replace original**:
   - Delete old file
   - Use downloaded file instead

**Time: ~2 minutes** (but most reliable if Excel fails)

---

## ✅ Verify the Fix Works

After fixing encoding, preview the data:

### In PowerShell:
```powershell
# Show first 2 rows
(Get-Content APPSC_Group2_Practice_Test_150Q.csv | Select-Object -First 2)

# Should show clear text like:
# Question_EN,Question_TE,OptionA_EN,OptionA_TE,...
# "Which Article...","భారత రాజ్యాంగంలో...",...
# NOT: "Which Article...","à°­à°¾à°°à°¤..."
```

### In VS Code:
- Open file
- Look for Telugu text
- Should be readable (not garbage symbols)

### In Excel:
- Open file
- Column B should show clear Telugu text, not: "à°†à°°à±"

---

## 🎯 Quick Comparison Table

| Tool | Time | Difficulty | Best For |
|------|------|-----------|----------|
| PowerShell Script | 10s | Easy | Automatic, foolproof |
| Notepad++ | 30s | Very Easy | Visual confirmation |
| Excel | 45s | Easy | If you're already using Excel |
| VS Code | 20s | Easy | If you have VS Code open |
| Python | 10s | Medium | Batch converting many files |
| Google Sheets | 2m | Easy | No install needed |

---

## ⚠️ Common Mistakes to Avoid

### ❌ WRONG:
```
Excel: File → Save As → Format: "CSV (Comma delimited)"
This saves as ANSI, not UTF-8!
```

### ✅ CORRECT:
```
Excel: File → Save As → Format: "CSV UTF-8 (Comma delimited)"
This saves as proper UTF-8!
```

### ❌ WRONG  (Notepad++):
```
Encoding → Encode in UTF-8 WITH BOM
This adds an extra byte at the start (✗ unnecessary)
```

### ✅ CORRECT (Notepad++):
```
Encoding → Encode in UTF-8 (without BOM)
Clean UTF-8, no extra bytes (✓ perfect)
```

---

## 🔧 Troubleshooting

### Q: I fixed the encoding but questions still don't appear
- Delete questions from database first
- Then re-upload the fixed CSV

**How:**
```
1. Go to Admin panel
2. Find "Delete All Questions" button for this exam (if exists)
3. Or manually delete in database
4. Then upload fixed CSV
```

### Q: Fixed file but Excel still shows garbage
- Excel caches encoding, close and reopen file
- Or use another program (VS Code, Notepad++) to verify

### Q: PowerShell script shows "command not found"
```powershell
# Enable script execution first
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run
.\fix-csv-encoding.ps1
```

### Q: File size changed after fixing
- Normal! UTF-8 can be more or less bytes depending on characters
- Expected for multilingual files

---

## 📞 Need Help?

After fixing, do this:

1. ✅ Pick a method above (PowerShell is easiest)
2. ✅ Run the fix
3. ✅ Verify with: `Get-Content file.csv -First 2`
4. ✅ Upload to your app
5. ✅ Check if questions appear with clear text

If questions still don't appear:
- Check browser console (F12 → Console tab)
- Look for error messages
- Verify exam is marked as "active"

---

## 🎉 After Fix: What You'll See

**In your exam interface:**
```
Question 2 of 138

Which Article of the Indian Constitution deals 
with the appointment of the Governor?

భారత రాజ్యాంగంలో గవర్నర్ నియామకానికి సంబంధించిన 
ఆర్టికల్ ఏది?

A) Article 153 / ఆర్టికల్ 153
B) Article 154 / ఆర్టికల్ 154  
C) Article 155 / ఆర్టికల్ 155 ✓
D) Article 156 / ఆర్టికల్ 156
```

Both English AND Telugu visible! 🎉

---

## ⚡ TL;DR (Too Long; Didn't Read)

**Single command (PowerShell):**
```powershell
# Automatic fix (80% of hassle gone)
.\fix-csv-encoding.ps1

# Done. Upload file now.
```

**If that doesn't work:**
1. Open file in Notepad++
2. Encoding → Encode in UTF-8
3. Save (Ctrl+S)
4. Done. Upload file now.

**Seriously that's it!** ✅
