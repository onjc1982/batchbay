import multer from 'multer';
import { Router } from 'express';
import { parseUploadedFile } from '../services/parser.js';

const upload = multer({ dest: '/tmp/uploads/' });
export const uploadRouter = Router();

// POST /api/upload - Upload and parse a CSV/Excel file
uploadRouter.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileExt = fileName.split('.').pop().toLowerCase();

    if (!['csv', 'xlsx', 'xls'].includes(fileExt)) {
      return res.status(400).json({ error: 'Unsupported file format. Please upload a CSV or Excel file (.csv, .xlsx, .xls)' });
    }

    const result = await parseUploadedFile(filePath, fileExt);

    res.json({
      success: true,
      fileName,
      rows: result.rows,
      columns: result.columns,
      totalRows: result.rows.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: `Failed to parse file: ${err.message}` });
  }
});