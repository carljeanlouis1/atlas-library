var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/content/[id]/artwork.ts
var onRequestPost = /* @__PURE__ */ __name(async (context) => {
  const authHeader = context.request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  if (apiKey !== context.env.ATLAS_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const contentId = context.params.id;
  let style = "infographic";
  try {
    const body = await context.request.json();
    if (body.style) {
      style = body.style;
    }
  } catch {
  }
  const content = await context.env.DB.prepare(
    "SELECT id, type, title, content, image_url FROM content WHERE id = ?"
  ).bind(contentId).first();
  if (!content) {
    return new Response(JSON.stringify({ error: "Content not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const contentPreview = content.content?.slice(0, 2e3) || "";
  const prompt = buildArtworkPrompt(content.type, content.title, contentPreview, style);
  try {
    const imageData = await generateWithGemini(context.env.GEMINI_API_KEY, prompt);
    const filename = `artwork-${contentId}-${Date.now()}.png`;
    const key = `artwork/${filename}`;
    await context.env.IMAGES.put(key, imageData, {
      httpMetadata: {
        contentType: "image/png"
      }
    });
    const urlKey = key.replace(/\//g, "--");
    const imageUrl = `https://atlas-library.pages.dev/api/img/${urlKey}`;
    await context.env.DB.prepare(
      "UPDATE content SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(imageUrl, contentId).run();
    return new Response(JSON.stringify({
      success: true,
      imageUrl,
      style
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Artwork generation failed:", error);
    return new Response(JSON.stringify({
      error: "Failed to generate artwork",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPost");
function buildArtworkPrompt(type, title, content, style) {
  const themes = extractThemes(content);
  const styleGuides = {
    infographic: "Clean modern infographic style with icons, data visualization elements, organized layout with visual hierarchy, professional business aesthetic, flat design with subtle gradients, information-focused composition",
    comic: "Bold comic book style with dynamic panels, vibrant colors, strong outlines, action-oriented composition, graphic novel aesthetic",
    editorial: "Sophisticated editorial illustration style, artistic and conceptual, rich colors, atmospheric lighting, magazine cover quality",
    abstract: "Abstract digital art with flowing shapes, geometric patterns, vibrant color gradients, modern artistic composition",
    minimal: "Minimalist design with clean lines, limited color palette, negative space, simple iconic elements, elegant simplicity"
  };
  const styleInstruction = styleGuides[style || "infographic"];
  return `Create a visually striking ${style} artwork for: "${title}"

Key themes and concepts: ${themes}

Style requirements: ${styleInstruction}

The image should be suitable as a header/hero image for a digital article. High quality, professional. No text or words in the image - only visual elements.`;
}
__name(buildArtworkPrompt, "buildArtworkPrompt");
function extractThemes(content) {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const keyPhrases = sentences.slice(0, 5).map((s) => s.trim().slice(0, 100));
  return keyPhrases.join(", ") || "general knowledge and insights";
}
__name(extractThemes, "extractThemes");
async function generateWithGemini(apiKey, prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      })
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }
  const data = await response.json();
  let imageData = null;
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      imageData = part.inlineData.data;
      break;
    }
  }
  if (!imageData) {
    const textParts = parts.filter((p) => p.text).map((p) => p.text);
    throw new Error(`No image generated. Model response: ${textParts.join(" ") || "empty"}`);
  }
  const binaryString = atob(imageData);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
__name(generateWithGemini, "generateWithGemini");

// api/images/upload.ts
var onRequestPost2 = /* @__PURE__ */ __name(async (context) => {
  const authHeader = context.request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  if (apiKey !== context.env.ATLAS_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const contentType = context.request.headers.get("Content-Type") || "";
  let imageData;
  let filename;
  let mimeType;
  if (contentType.includes("multipart/form-data")) {
    const formData = await context.request.formData();
    const file = formData.get("image");
    if (!file) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    imageData = await file.arrayBuffer();
    filename = formData.get("filename") || file.name || `${Date.now()}.png`;
    mimeType = file.type || "image/png";
  } else {
    const body = await context.request.json();
    if (!body.data) {
      return new Response(JSON.stringify({ error: "No image data provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const base64Data = body.data.replace(/^data:image\/\w+;base64,/, "");
    imageData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)).buffer;
    filename = body.filename || `${Date.now()}.png`;
    mimeType = body.mimeType || "image/png";
  }
  const key = `images/${Date.now()}-${filename}`;
  await context.env.IMAGES.put(key, imageData, {
    httpMetadata: {
      contentType: mimeType
    }
  });
  const publicUrl = `https://images.atlas-library.pages.dev/${key}`;
  return new Response(JSON.stringify({
    success: true,
    key,
    url: publicUrl
  }), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestPost");

// api/chat/[contentId].ts
var onRequestPost3 = /* @__PURE__ */ __name(async (context) => {
  const contentId = context.params.contentId;
  const body = await context.request.json();
  const content = await context.env.DB.prepare(
    "SELECT * FROM content WHERE id = ?"
  ).bind(contentId).first();
  if (!content) {
    return new Response(JSON.stringify({ error: "Content not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { results: previousMessages } = await context.env.DB.prepare(
    "SELECT role, message FROM chat_messages WHERE content_id = ? ORDER BY created_at ASC LIMIT 20"
  ).bind(contentId).all();
  const messages = previousMessages.map((m) => ({
    role: m.role,
    content: m.message
  }));
  messages.push({ role: "user", content: body.message });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": context.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: `You are Atlas, Carl's AI assistant. You're discussing the following content with him:

Title: ${content.title}
Type: ${content.type}

Content:
${content.content?.slice(0, 8e3) || "Audio content - no transcript available"}

Be conversational, insightful, and reference specific parts of the content when relevant.`,
      messages
    })
  });
  if (!response.ok) {
    const error = await response.text();
    return new Response(JSON.stringify({ error: "AI request failed", details: error }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const aiResponse = await response.json();
  const assistantMessage = aiResponse.content.find((c) => c.type === "text")?.text || "";
  const userMsgId = crypto.randomUUID();
  const assistantMsgId = crypto.randomUUID();
  await context.env.DB.batch([
    context.env.DB.prepare(
      "INSERT INTO chat_messages (id, content_id, role, message) VALUES (?, ?, ?, ?)"
    ).bind(userMsgId, contentId, "user", body.message),
    context.env.DB.prepare(
      "INSERT INTO chat_messages (id, content_id, role, message) VALUES (?, ?, ?, ?)"
    ).bind(assistantMsgId, contentId, "assistant", assistantMessage)
  ]);
  return new Response(JSON.stringify({
    success: true,
    message: assistantMessage
  }), {
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestPost");

// api/content/[id].ts
var onRequestGet = /* @__PURE__ */ __name(async (context) => {
  const id = context.params.id;
  const content = await context.env.DB.prepare(
    "SELECT * FROM content WHERE id = ?"
  ).bind(id).first();
  if (!content) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { results: tags } = await context.env.DB.prepare(
    `SELECT t.name FROM tags t 
     JOIN content_tags ct ON t.id = ct.tag_id 
     WHERE ct.content_id = ?`
  ).bind(id).all();
  const { results: messages } = await context.env.DB.prepare(
    "SELECT * FROM chat_messages WHERE content_id = ? ORDER BY created_at ASC"
  ).bind(id).all();
  let pages = null;
  if (content.type === "story") {
    const { results: pageResults } = await context.env.DB.prepare(
      "SELECT * FROM story_pages WHERE content_id = ? ORDER BY page_number ASC"
    ).bind(id).all();
    pages = pageResults.map((page) => ({
      ...page,
      narration_segments: page.narration_segments ? JSON.parse(page.narration_segments) : null
    }));
  }
  return new Response(JSON.stringify({
    success: true,
    content: {
      ...content,
      metadata: content.metadata ? JSON.parse(content.metadata) : null,
      tags: tags.map((t) => t.name),
      chat: messages,
      pages
    }
  }), {
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestGet");

// api/images/[[path]].ts
var onRequestGet2 = /* @__PURE__ */ __name(async (context) => {
  const path = context.params.path;
  const key = Array.isArray(path) ? path.join("/") : path;
  const object = await context.env.IMAGES.get(key);
  if (!object) {
    return new Response("Not found", { status: 404 });
  }
  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "image/png");
  headers.set("Cache-Control", "public, max-age=31536000");
  headers.set("ETag", object.etag);
  return new Response(object.body, { headers });
}, "onRequestGet");

// api/img/[[key]].ts
var onRequestGet3 = /* @__PURE__ */ __name(async (context) => {
  const keyParts = context.params.key;
  const keyParam = Array.isArray(keyParts) ? keyParts.join("/") : keyParts;
  const key = keyParam.replace(/--/g, "/");
  const object = await context.env.IMAGES.get(key);
  if (!object) {
    return new Response(JSON.stringify({ error: "Not found", key }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }
  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "image/png");
  headers.set("Cache-Control", "public, max-age=31536000");
  headers.set("ETag", object.etag);
  return new Response(object.body, { headers });
}, "onRequestGet");

// api/content.ts
var onRequestGet4 = /* @__PURE__ */ __name(async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get("type");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  let query = "SELECT * FROM content";
  const params = [];
  if (type) {
    query += " WHERE type = ?";
    params.push(type);
  }
  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  const { results } = await context.env.DB.prepare(query).bind(...params).all();
  return new Response(JSON.stringify({ success: true, content: results }), {
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestGet");
var onRequestPost4 = /* @__PURE__ */ __name(async (context) => {
  const authHeader = context.request.headers.get("Authorization");
  const apiKey = authHeader?.replace("Bearer ", "");
  if (apiKey !== context.env.ATLAS_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const body = await context.request.json();
  const id = crypto.randomUUID();
  await context.env.DB.prepare(
    "INSERT INTO content (id, type, title, content, audio_url, image_url, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(
    id,
    body.type,
    body.title,
    body.content || null,
    body.audioUrl || null,
    body.imageUrl || null,
    body.metadata ? JSON.stringify(body.metadata) : null
  ).run();
  if (body.type === "story" && body.pages && body.pages.length > 0) {
    for (const page of body.pages) {
      const pageId = crypto.randomUUID();
      const narrationText = page.narration?.map((n) => n.narration_text).join(" ") || null;
      await context.env.DB.prepare(
        "INSERT INTO story_pages (id, content_id, page_number, image_url, image_base64, narration_text, narration_segments) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        pageId,
        id,
        page.page_number,
        page.image_url || null,
        page.image_base64 || null,
        narrationText,
        page.narration ? JSON.stringify(page.narration) : null
      ).run();
    }
  }
  if (body.tags && body.tags.length > 0) {
    for (const tagName of body.tags) {
      await context.env.DB.prepare(
        "INSERT OR IGNORE INTO tags (name) VALUES (?)"
      ).bind(tagName).run();
      const tag = await context.env.DB.prepare(
        "SELECT id FROM tags WHERE name = ?"
      ).bind(tagName).first();
      if (tag) {
        await context.env.DB.prepare(
          "INSERT INTO content_tags (content_id, tag_id) VALUES (?, ?)"
        ).bind(id, tag.id).run();
      }
    }
  }
  return new Response(JSON.stringify({ success: true, id }), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
}, "onRequestPost");

// api/tts.ts
var onRequestPost5 = /* @__PURE__ */ __name(async (context) => {
  const body = await context.request.json();
  if (!body.text) {
    return new Response(JSON.stringify({ error: "No text provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const echoStudioUrl = "https://echo-studio.pages.dev/api/atlas/generate";
  const echoApiKey = context.env.ECHO_STUDIO_API_KEY;
  if (!echoApiKey) {
    return new Response(JSON.stringify({ error: "Echo Studio API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const response = await fetch(echoStudioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Atlas-API-Key": echoApiKey
      },
      body: JSON.stringify({
        title: "Library TTS",
        text: body.text.slice(0, 5e4),
        // Limit text length
        voice: body.voice || "nova",
        metadata: {
          source: "atlas-library",
          contentId: body.contentId
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Echo Studio error: ${response.status}`);
    }
    const data = await response.json();
    if (body.contentId && data.audioUrl) {
      const fullAudioUrl = `https://echo-studio.pages.dev${data.audioUrl}`;
      await context.env.DB.prepare(
        "UPDATE content SET audio_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(fullAudioUrl, body.contentId).run();
      return new Response(JSON.stringify({
        success: true,
        audioUrl: fullAudioUrl
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      audioUrl: data.audioUrl ? `https://echo-studio.pages.dev${data.audioUrl}` : null
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(JSON.stringify({
      error: "TTS generation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPost");

// api/voice-preview.ts
var onRequestPost6 = /* @__PURE__ */ __name(async (context) => {
  const body = await context.request.json();
  const echoStudioUrl = "https://echo-studio.pages.dev/api/atlas/generate";
  const echoApiKey = context.env.ECHO_STUDIO_API_KEY;
  if (!echoApiKey) {
    return new Response(JSON.stringify({ error: "Echo Studio API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const response = await fetch(echoStudioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Atlas-API-Key": echoApiKey
      },
      body: JSON.stringify({
        title: "Voice Preview",
        text: body.text || "Hello! This is how I sound.",
        voice: body.voice || "nova",
        metadata: {
          source: "atlas-library-preview",
          isPreview: true
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Echo Studio error: ${response.status}`);
    }
    const data = await response.json();
    return new Response(JSON.stringify({
      success: true,
      audioUrl: data.audioUrl ? `https://echo-studio.pages.dev${data.audioUrl}` : null
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Voice preview error:", error);
    return new Response(JSON.stringify({
      error: "Preview generation failed"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestPost");

// ../.wrangler/tmp/pages-HPxH1X/functionsRoutes-0.060190172135540454.mjs
var routes = [
  {
    routePath: "/api/content/:id/artwork",
    mountPath: "/api/content/:id",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/images/upload",
    mountPath: "/api/images",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/chat/:contentId",
    mountPath: "/api/chat",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/content/:id",
    mountPath: "/api/content",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/images/:path*",
    mountPath: "/api/images",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/img/:key*",
    mountPath: "/api/img",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/content",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/content",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/tts",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/voice-preview",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
