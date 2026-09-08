// Vercel serverless function: reads an uploaded floor-plan photo with Gemini's vision +
// structured output and returns a simplified rectangular room layout as JSON. The Gemini API key
// never reaches the browser — this endpoint is the only thing that calls Google.
import { GoogleGenAI } from '@google/genai'

// Vercel Node function config — vision + structured-output calls can take a while
export const config = {
  maxDuration: 60,
}

// established model with a more generous free-tier quota than newer flagship releases —
// good enough for a best-effort layout sketch from a photo
const MODEL = 'gemini-2.5-flash'
const MAX_BASE64_LENGTH = 4_000_000 // ~3MB decoded — headroom for the larger 1800px resize

const SYSTEM_PROMPT = `You are reading a photo of a home floor plan (a sketch, blueprint, or \
photographed diagram) and converting it into a simplified 2D layout.

Rules:
- Model every distinct room as an axis-aligned rectangle: {name, x, y, width, height}, all in meters.
- (x, y) is the room's top-left corner in one shared coordinate plane, y increasing downward — the \
same orientation the floor plan is drawn in.
- Rooms must not overlap. Position them so rooms that are adjacent in the photo share an edge, and \
the overall arrangement matches the photo's real layout and topology as closely as possible.
- Look carefully for any printed or handwritten dimension text on the plan (e.g. "10'-0\" x 12'-6\"", \
"3.5m x 4m", numbers running along a wall or inside a room). Treat these as ground truth: parse them, \
convert to meters (1 ft = 0.3048 m), and use them as that room's exact width/height.
- Only when no dimension text is visible anywhere on the plan should you fall back to estimating \
realistic residential room sizes (bedrooms roughly 3-4m per side, bathrooms roughly 2x2m, kitchens \
roughly 3x3m, living rooms larger, hallways narrow), keeping rooms' sizes relative to each other \
consistent with the photo.
- Use short, clear room names as labeled in the photo (e.g. "Bedroom", "Kitchen", "Bathroom"); if a \
room is unlabeled, infer a reasonable name from context.
- Output between 1 and 12 rooms. Ignore furniture and any text or markings that aren't room \
boundaries.`

const LAYOUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    rooms: {
      type: 'array',
      minItems: 1,
      maxItems: 12,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
        required: ['name', 'x', 'y', 'width', 'height'],
      },
    },
  },
  required: ['rooms'],
}

function parseDataUrl(image) {
  const match = typeof image === 'string' && image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], base64Data: match[2] }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Server is not configured with a GEMINI_API_KEY.' })
    return
  }

  const parsed = parseDataUrl(req.body?.image)
  if (!parsed) {
    res.status(400).json({ error: 'Upload a valid image.' })
    return
  }
  if (parsed.base64Data.length > MAX_BASE64_LENGTH) {
    res.status(413).json({ error: 'That image is too large — try a smaller photo.' })
    return
  }

  try {
    const client = new GoogleGenAI({ apiKey })
    const interaction = await client.interactions.create({
      model: MODEL,
      input: [
        { type: 'text', text: `${SYSTEM_PROMPT}\n\nRead this floor plan photo and output the room layout.` },
        { type: 'image', data: parsed.base64Data, mime_type: parsed.mimeType },
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: LAYOUT_JSON_SCHEMA,
      },
      // this task doesn't need deep reasoning — keep it quick so we stay well under
      // Vercel's 60s function limit instead of burning it on extended thinking
      generation_config: {
        thinking_level: 'low',
      },
    })

    const layout = JSON.parse(interaction.output_text)
    if (!Array.isArray(layout?.rooms) || layout.rooms.length === 0) {
      res.status(502).json({ error: "Couldn't read a layout from that photo. Try a clearer, simpler floor plan image." })
      return
    }

    res.status(200).json(layout)
  } catch (err) {
    console.error('analyze-layout error', err)
    res.status(502).json({ error: 'Failed to analyze the image. Please try again.' })
  }
}
