import { Router } from 'express';
import multer from 'multer';

const upload = multer({ dest: '/tmp/uploads/' });

export const templateRouter = Router();

// In-memory template store
let savedTemplates = [];

// POST /api/templates/save - Save an HTML template
templateRouter.post('/save', (req, res) => {
  try {
    const { name, html } = req.body;
    if (!name || !html) {
      return res.status(400).json({ error: 'Name and HTML content are required' });
    }

    const template = {
      id: Date.now().toString(),
      name,
      html,
      createdAt: new Date().toISOString(),
    };

    const existingIdx = savedTemplates.findIndex(t => t.name === name);
    if (existingIdx >= 0) {
      savedTemplates[existingIdx] = { ...savedTemplates[existingIdx], html, updatedAt: new Date().toISOString() };
    } else {
      savedTemplates.push(template);
    }

    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/templates - Get all saved templates
templateRouter.get('/', (req, res) => {
  res.json({ success: true, templates: savedTemplates });
});