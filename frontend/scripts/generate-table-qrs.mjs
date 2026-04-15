import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import QRCode from 'qrcode';

const tables = Array.from({ length: 7 }, (_, index) => `T${index + 1}`);
const baseUrl = (process.env.TABLE_QR_BASE_URL || 'https://restrauntqrsystemfrontend.vercel.app').replace(/\/$/, '');
const outputDir = path.resolve('public', 'table-qrs');

const createSvg = async (tableId) => {
  const tableUrl = `${baseUrl}/customer/order?tableId=${encodeURIComponent(tableId)}`;
  return QRCode.toString(tableUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#111111',
      light: '#ffffff',
    },
  });
};

const createPng = async (tableId, filePath) => {
  const tableUrl = `${baseUrl}/customer/order?tableId=${encodeURIComponent(tableId)}`;
  await QRCode.toFile(filePath, tableUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 1024,
    color: {
      dark: '#111111',
      light: '#ffffff',
    },
  });
};

const main = async () => {
  await mkdir(outputDir, { recursive: true });

  await Promise.all(
    tables.map(async (tableId) => {
      const svg = await createSvg(tableId);
      const fileName = `${tableId.toLowerCase()}.svg`;
      const filePath = path.join(outputDir, fileName);
      await writeFile(filePath, svg, 'utf8');
      await createPng(tableId, path.join(outputDir, `${tableId.toLowerCase()}.png`));
      console.log(`Generated ${fileName}`);
    })
  );

  const manifest = tables
    .map((tableId) => ({
      tableId,
      url: `${baseUrl}/customer/order?tableId=${encodeURIComponent(tableId)}`,
      file: `/table-qrs/${tableId.toLowerCase()}.svg`,
    }))
    .map((entry) => `${entry.tableId}\t${entry.file}\t${entry.url}`)
    .join('\n');

  await writeFile(path.join(outputDir, 'manifest.txt'), `${manifest}\n`, 'utf8');
  console.log('Generated manifest.txt');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
