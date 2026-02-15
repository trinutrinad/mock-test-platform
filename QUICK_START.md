# 🚀 QUICK START GUIDE - Bilingual CSV Support

## 30-Second Overview

Your mock-test-platform now supports **bilingual CSV uploads** with automatic detection of English + regional language columns (Telugu, Hindi, Tamil, etc.).

---

## ⚡ Quick Commands

```bash
# Test the implementation (9/9 tests)
npm run test:csv

# Start development
npm run dev

# Build for production
npm run build
```

---

## 📋 Try It Now

### 1. Verify Installation
```bash
npm run test:csv
```
**Expected**: "9/9 tests passed ✓"

### 2. Upload Sample Bilingual CSV
- Start app: `npm run dev`
- Go to: Admin > Bulk Upload
- Upload: `samples/bilingual_sample.csv`
- See: English + Telugu questions merged

### 3. Create Your First Bilingual CSV

**Template (English + Telugu):**
```csv
Question_EN,Question_TE,OptionA_EN,OptionA_TE,OptionB_EN,OptionB_TE,OptionC_EN,OptionC_TE,OptionD_EN,OptionD_TE,Answer
What is the capital?,రాజధానిని ఎంటర్,Delhi,ఢిల్లీ,Mumbai,ముంబై,Bangalore,బెంగళూరు,Chennai,చెన్నై,A
```

**Or use standard English:**
```csv
Question,OptionA,OptionB,OptionC,OptionD,Answer
What is 2+2?,3,4,5,6,B
```

---

## 📖 Documentation

- **Quick Reference**: See `QUICK_REFERENCE.sh`
- **Complete Guide**: Read `CSV_BILINGUAL_GUIDE.md`
- **Technical Details**: Check `BILINGUAL_IMPLEMENTATION.md`
- **Migration Help**: Review `BEFORE_AFTER.md`

---

## ✅ What Works Now

✅ English + Telugu bilingual questions  
✅ English + Hindi bilingual questions  
✅ English + any of 13 supported languages  
✅ Standard single-language CSV (no changes)  
✅ Mixed bilingual and single-language in same file  
✅ Automatic BOM detection  
✅ UTF-8 encoding guaranteed  
✅ Graceful error handling (invalid rows skip, valid rows upload)  

---

## 🎯 Supported Language Codes

Use in CSV column names like `Question_EN`, `Question_TE`, etc.:

- **EN** - English
- **TE** - Telugu
- **HI** - Hindi
- **TA** - Tamil
- **ML** - Malayalam
- **KN** - Kannada
- **GU** - Gujarati
- **MR** - Marathi
- **BN** - Bengali
- **PA** - Punjabi
- **UR** - Urdu
- **AS** - Assamese
- **KS** - Kashmiri

---

## 🐛 Troubleshooting

### Issue: Tests fail
**Fix**: Run `npm install` first, then `npm run test:csv`

### Issue: CSV shows as invalid
**Fix**: Check headers match one of these patterns:
- Single: `Question`, `OptionA`, `OptionB`, `OptionC`, `OptionD`, `Answer`
- Bilingual: `Question_EN`, `Question_TE`, `OptionA_EN`, `OptionA_TE`, ...

### Issue: Unicode characters show as ?
**Fix**: Save CSV as UTF-8 (not ANSI) in your text editor

### Issue: Row marked invalid but looks OK
**Fix**: Check for:
- Trailing whitespace
- Empty cells in required fields
- Answer not in A/B/C/D or 1/2/3/4 format

---

## 📊 How It Works

```
1. Upload CSV
    ↓
2. Auto-detect encoding (UTF-8/BOM)
    ↓
3. Detect bilingual columns (X_EN, X_TE)
    ↓
4. Merge: "English<br/>తెలుగు"
    ↓
5. Validate each row
    ↓
6. Show preview (errors highlighted)
    ↓
7. Fix invalid rows (optional)
    ↓
8. Upload to database
```

---

## 🎓 Example: English + Telugu

**CSV Input:**
```csv
Question_EN,Question_TE,OptionA_EN,OptionA_TE,OptionB_EN,OptionB_TE,OptionC_EN,OptionC_TE,OptionD_EN,OptionD_TE,Answer
What is the capital of India?,భారతదేశ యొక్క రాజధానిని ఏమిటి?,Delhi,ఢిల్లీ,Mumbai,ముంబై,Bangalore,బెంగళూరు,Chennai,చెన్నై,A
```

**Database Storage:**
```
question: "What is the capital of India?<br/>భారతదేశ యొక్క రాజధానిని ఏమిటి?"
option_a: "Delhi<br/>ఢిల్లీ"
option_b: "Mumbai<br/>ముంబై"
option_c: "Bangalore<br/>బెంగళూరు"
option_d: "Chennai<br/>చెన్నై"
correct_option: "A"
```

**Frontend Display:**
```
What is the capital of India?
భారతదేశ యొక్క రాజధానిని ఏమిటి?

A) Delhi / ఢిల్లీ
B) Mumbai / ముంబై
C) Bangalore / బెంగళూరు
D) Chennai / చెన్నై
```

---

## 📁 File Locations

| What | Where |
|------|-------|
| **CSV Parser** | `src/services/csvUploadService.js` |
| **UI Component** | `src/components/BulkUpload.jsx` |
| **Sample CSV** | `samples/bilingual_sample.csv` |
| **Tests** | `test-csv-service.js` |
| **Full Guide** | `CSV_BILINGUAL_GUIDE.md` |

---

## ✨ Key Features

🎯 **Automatic Detection**
- Bilingual columns auto-detected
- BOM auto-removed
- No manual configuration

🛡️ **Robust Error Handling**
- Invalid rows skip, batch continues
- Detailed error messages
- Row-by-row validation logging

🌍 **Multi-Language**
- 13 languages supported
- Easy to extend
- Real-world usage (Telugu, Hindi, Tamil, etc.)

📊 **Data Integrity**
- UTF-8 guaranteed
- No encoding corruption
- Unicode preserved

---

## 🔗 Related Commands

```bash
npm run test:csv          # Run test suite
npm run dev               # Start dev server
npm run build             # Build for production
npm run lint              # Run linter
npm run preview           # Preview build
```

---

## 💡 Tips & Tricks

**Tip 1**: Always save CSV as UTF-8  
**Tip 2**: Use exact column names or bilingual patterns  
**Tip 3**: Check console logs for validation details  
**Tip 4**: Test with sample first: `samples/bilingual_sample.csv`  
**Tip 5**: Empty rows are auto-skipped  

---

## 🚀 Ready to Deploy?

```bash
✓ Code complete
✓ Tests passing (9/9)
✓ Documentation done
✓ Sample provided

npm run test:csv    # Final verification
git push            # Deploy!
```

---

## 📞 Need Help?

1. **Tests failing?** → Run `npm run test:csv`
2. **CSV not uploading?** → Check headers in `CSV_BILINGUAL_GUIDE.md`
3. **Unicode issues?** → Save file as UTF-8
4. **Want more details?** → Read `BILINGUAL_IMPLEMENTATION.md`

---

## 🎉 Success Metrics

After implementation, you can:
- ✅ Upload bilingual CSV files
- ✅ Support 13+ languages
- ✅ Handle encoding safely
- ✅ Process invalid rows gracefully
- ✅ Display merged bilingual content

**All with zero code changes needed in existing features!**

---

*Implementation ready Feb 15, 2026*
*All tests passing ✓*
*Production ready ✓*
