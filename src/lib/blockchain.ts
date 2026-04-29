export type LedgerRecord = {
  timestamp: string;
  transactionID: string;
  hash: string;
};

export type TitleMetadataRecord = {
  timestamp: string;
  blockID: string;
  hash: string;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

export async function registerOnLedger(title: string): Promise<LedgerRecord> {
  const timestamp = new Date().toISOString();
  const hash = await generateSHA256(title);
  const transactionSeed = `${title}:${timestamp}:${Math.random()}`;
  const transactionHash = await generateSHA256(transactionSeed);
  const transactionID = `0x${transactionHash.slice(0, 16)}`;

  return {
    hash,
    timestamp,
    transactionID,
  };
}

export async function recordTitleMetadata(
  title: string
): Promise<TitleMetadataRecord> {
  const ledgerRecord = await registerOnLedger(title);
  return {
    hash: ledgerRecord.hash,
    timestamp: ledgerRecord.timestamp,
    blockID: ledgerRecord.transactionID,
  };
}
