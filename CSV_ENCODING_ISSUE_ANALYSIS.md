# CSV Encoding Issue - Root Cause Analysis

## 🔴 Problem Identified

Your CSV file `APPSC_Group2_Practice_Test_150Q.csv` has **corrupted character encoding**, particularly for Telugu text.

### What We Found:
```
Expected:  "Article 153" | "ఆర్టికల్ 153"
Actual:    "Article 153" | "à°†à°°à±¯à°¾à°®à°•à°¾à°¨à°¿..." (mojibake/garbled)
```

## Why Questions Don't Appear

When you upload the CSV:

1. **Parsing Phase** ✓ - Column detection works fine
   - Headers are recognized: `Question_EN, Question_TE, OptionA_EN, OptionA_TE, Answer`
   - The bilingual detection works

2. **Data Extraction Phase** ❌ - **FAILS HERE**
   - The app reads: "à°†à°°à±" instead of "ఆర్టికల్"
   - The corrupted text is stored in the database
   - Questions appear empty or with garbage text

3. **Display Phase** - Displays garbage or blank

## Root Causes

### 1. **File Encoding Mismatch** (Most Likely)
   - CSV saved in **Windows-1252 or CP-1252** instead of UTF-8
   - Telugu characters require UTF-8 (2-4 bytes per character)
   - When read as wrong encoding, bytes scramble

### 2. **Double Encoding** (Less Likely)
   - File was saved as UTF-8, then re-saved with wrong encoding assumption
   - Creates double-encoded entities

### 3. **Excel/CSV Tool Issue** (Probable)
   - Microsoft Excel defaults to ANSI/Windows encoding
   - CSV export from Excel without explicit UTF-8 selection = mojibake

## Visual Comparison

### Correct Telugu Encoding (UTF-8):
```
Byte sequence: E0 B0 86 (UTF-8 for ఆ)
Display: ఆ
```

### Your File (Corrupted):
```
Byte sequence: C2 A0 (UTF-8 interpreted as ISO-8859-1 then re-encoded)
Display: à°
```

---

## ✅ Solution

### Step 1: Re-save the CSV in UTF-8 Format

**Option A: Using Notepad++**
1. Open `APPSC_Group2_Practice_Test_150Q.csv` in Notepad++
2. Click `Encoding` menu → Select `Encode in UTF-8` (NOT UTF-8 BOM)
3. Save file
4. Reload in your app

**Option B: Using Excel (Correct Way)**
1. Open the CSV in Excel
2. File → Save As
3. Format: **CSV UTF-8 (Comma delimited)** (.csv)
4. ✓ Make sure it says "UTF-8" not "ANSI"

**Option C: Using Python (Most Reliable)**
```python
import pandas as pd

# Read with wrong encoding
df = pd.read_csv('APPSC_Group2_Practice_Test_150Q.csv', encoding='cp1252')

# Write correctly with UTF-8
df.to_csv('APPSC_Group2_Practice_Test_150Q.csv', index=False, encoding='utf-8')
print("✓ File re-saved in UTF-8")
```

**Option D: Using PowerShell (Windows)**
```powershell
# Read file
$content = Get-Content 'APPSC_Group2_Practice_Test_150Q.csv' -Encoding UTF8

# Write back in UTF-8 (without BOM)
$content | Out-File 'APPSC_Group2_Practice_Test_150Q.csv' -Encoding UTF8NoBOM
```

### Step 2: Verify the Fix

After re-saving, check if Telugu text appears correctly:

```powershell
# Should show: "ఆర్టికల్" not "à°†à°°à±"
(Get-Content 'APPSC_Group2_Practice_Test_150Q.csv' -TotalCount 2) | Select-Object -Last 1
```

### Step 3: Re-upload CSV to Your App

1. Go to Admin → Bulk Upload
2. Select your re-saved CSV file
3. Click "Process File"
4. Verify preview shows correct Telugu text
5. Click "Upload Questions"

---

## 🔍 What the App Expects

Your CSV format is **CORRECT**:
```
Question_EN,Question_TE,OptionA_EN,OptionA_TE,OptionB_EN,OptionB_TE,OptionC_EN,OptionC_TE,OptionD_EN,OptionD_TE,Answer
"English question","తెలుగు質問","Answer 1","సమాధానం 1",...,"C"
```

**The app will:**
- ✓ Detect bilingual columns (ending in `_EN`, `_TE`)
- ✓ Merge them with `<br/>` separator
- ✓ Store as: "English question<br/>తెలుగు Question"
- ✓ Display both languages in exam

---

## 📊 Database Format After Upload

### What Gets Stored (CORRECT):
```sql
question: "Which Article of the Indian Constitution deals with the appointment of the Governor?<br/>భారత రాజ్యాంగంలో గవర్నర్ నియామకానికి సంబంధించిన ఆర్టికల్ ఏది?"

option_a: "Article 153<br/>ఆర్టికల్ 153"
option_b: "Article 154<br/>ఆర్టికల్ 154"
option_c: "Article 155<br/>ఆర్టికల్ 155"
option_d: "Article 156<br/>ఆర్టికల్ 156"

correct_option: "C"
```

### What Gets Stored (WRONG - Your Case):
```sql
question: "Which Article of the Indian Constitution deals with the appointment of the Governor?<br/>à°­à°¾à°°"

option_a: "Article 153<br/>à°†à°°à±"  ← CORRUPTED!
...
```

---

## 🚀 Prevention for Future

When creating CSV files with bilingual content:

1. **Use UTF-8 explicitly**:
   - Google Sheets: File → Download → CSV UTF-8
   - Excel: Save As → CSV UTF-8 (NOT CSV ANSI)
   - Notepad++: Encoding → UTF-8
   - Python: `pd.to_csv(..., encoding='utf-8')`

2. **Test first**: Upload a small sample (5 questions) to verify

3. **Never copy-paste from corrupt source**: Re-type or use reliable sources

---

## 🆘 Need Help?

If you still see garbled text after fixing encoding:

1. **Clear the database**: Delete all questions for this exam
2. **Re-upload**: Fresh start with correctly encoded CSV
3. **Check browser console**: (F12) - look for warnings

Your CSV structure is PERFECT. It's just the encoding of the text content that's wrong.

✅ **After fixing:** Your exam will display both English and Telugu! 🎉
