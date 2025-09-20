const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// 静的ファイルを配信
app.use(express.static('.'));

// すべてのルートをindex.htmlにリダイレクト（SPA用）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
