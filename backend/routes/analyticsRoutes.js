const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');

router.get('/visitor-stats', async (req, res) => {
  try {
    // Aggregate by sessionId to count unique visitors
    const deviceStats = await Visitor.aggregate([
      { $group: { _id: { sessionId: '$sessionId', device: '$device' }, count: { $sum: 1 } } },
      { $group: { _id: '$_id.device', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const browserStats = await Visitor.aggregate([
      { $group: { _id: { sessionId: '$sessionId', browser: '$browser' }, count: { $sum: 1 } } },
      { $group: { _id: '$_id.browser', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const osStats = await Visitor.aggregate([
      { $group: { _id: { sessionId: '$sessionId', os: '$os' }, count: { $sum: 1 } } },
      { $group: { _id: '$_id.os', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ deviceStats, browserStats, osStats });
  } catch (err) {
    console.error('Error in visitor-stats:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;