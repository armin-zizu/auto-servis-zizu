import { NextResponse } from 'next/server';

interface VpicResult {
  Make?: string;
  Model?: string;
  ModelYear?: string;
  ErrorText?: string;
}

interface VpicResponse {
  Results?: VpicResult[];
}

interface VinCandidate {
  vin: string;
  score: number;
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function makeMatches(expected: string, decoded: string): boolean {
  const expectedNormalized = normalize(expected);
  const decodedNormalized = normalize(decoded);
  if (!expectedNormalized || !decodedNormalized) return false;

  const aliases: Record<string, string[]> = {
    vw: ['volkswagen'],
    volkswagen: ['vw'],
  };
  return (
    expectedNormalized === decodedNormalized ||
    decodedNormalized.includes(expectedNormalized) ||
    expectedNormalized.includes(decodedNormalized) ||
    aliases[expectedNormalized]?.some((alias) => decodedNormalized.includes(alias)) === true
  );
}

export async function POST(request: Request) {
  let body: {
    candidates?: VinCandidate[];
    make?: string;
    model?: string;
    year?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ results: [] }, { status: 400 });
  }

  const candidates = (Array.isArray(body.candidates) ? body.candidates : [])
    .filter(
      (candidate): candidate is VinCandidate =>
        typeof candidate?.vin === 'string' &&
        VIN_PATTERN.test(candidate.vin) &&
        typeof candidate.score === 'number'
    )
    .slice(0, 4);
  if (!candidates.length) return NextResponse.json({ results: [] });

  const modelYear = /^\d{4}$/.test(body.year || '') ? body.year : '';
  const decodedResults = await Promise.all(
    candidates.map(async ({ vin, score }) => {
      try {
        const url = new URL(
          `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}`
        );
        url.searchParams.set('format', 'json');
        if (modelYear) url.searchParams.set('modelyear', modelYear);
        const response = await fetch(url, {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) return null;
        const data = (await response.json()) as VpicResponse;
        const decoded = data.Results?.[0];
        if (!decoded) return null;
        const makeMatch = makeMatches(body.make || '', decoded.Make || '');
        const expectedModel = normalize(body.model || '');
        const decodedModel = normalize(decoded.Model || '');
        const modelMatch = Boolean(
          expectedModel && decodedModel && decodedModel.includes(expectedModel)
        );
        const yearMatch = Boolean(modelYear && decoded.ModelYear === modelYear);

        return {
          vin,
          score,
          make: decoded.Make || '',
          model: decoded.Model || '',
          modelYear: decoded.ModelYear || '',
          makeMatch,
          modelMatch,
          yearMatch,
          vehicleMatch: makeMatch && modelMatch,
        };
      } catch {
        return null;
      }
    })
  );

  return NextResponse.json({ results: decodedResults.filter(Boolean) });
}
