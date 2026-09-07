import { NextRequest, NextResponse } from "next/server";

type GooglePrediction = {
  place_id: string;
  description: string;
};

type GoogleAutocompleteResponse = {
  status: string;
  error_message?: string;
  predictions?: GooglePrediction[];
};

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.trim() ?? "";
  if (input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { predictions: [], error: "Address lookup is not configured." },
      { status: 200 },
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("types", "address");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  const data = (await response.json()) as GoogleAutocompleteResponse;

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json(
      { predictions: [], error: data.error_message ?? data.status },
      { status: 200 },
    );
  }

  const predictions = (data.predictions ?? []).map((p) => ({
    placeId: p.place_id,
    description: p.description,
  }));

  return NextResponse.json({ predictions });
}
