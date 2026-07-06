// Supabase Edge Function: generate-study-material
// Deno runtime – körs i Supabase Edge Functions miljö
//
// Miljövariabler:
//   ANTHROPIC_API_KEY  – krävs i produktion
//   MOCK_AI=true       – returnerar hårdkodat exempelsvar, kräver ingen nyckel
//
// Anropas från klienten:
//   supabase.functions.invoke('generate-study-material', { body: { document_id } })

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratedMaterial {
  summary: string;
  flashcards: Array<{ question: string; answer: string }>;
  mindmap: object;
  quiz_questions: Array<{ question: string; options: string[]; correct_answer: string }>;
}

// ─── Mock-svar (används när MOCK_AI=true) ────────────────────────────────────

function getMockMaterial(): GeneratedMaterial {
  return {
    summary: `# Sammanfattning

Det uppladdade dokumentet handlar om **molntjänster och Azure**.

## Nyckelkoncept

Molnberäkning (cloud computing) är leverans av IT-resurser via internet på begäran, med prissättning baserad på faktisk användning (pay-as-you-go).

### Tjänstemodeller
- **IaaS** (Infrastructure as a Service) – virtuella maskiner, lagring, nätverk
- **PaaS** (Platform as a Service) – utvecklingsplattformar, databaser
- **SaaS** (Software as a Service) – färdiga applikationer via webben

### Azure-tjänster
Azure erbjuder hundratals molntjänster inom beräkning, lagring, nätverk, AI och analys. Viktiga grundläggande tjänster inkluderar Virtual Machines, Blob Storage, Azure SQL och Azure Active Directory.

## Driftsättningsmodeller
- **Privat moln** – ger mest kontroll, används av enskilda organisationer
- **Offentligt moln** – delad infrastruktur, lägre kostnad
- **Hybridmoln** – kombination av privat och offentligt`,

    flashcards: [
      { question: 'Vad är IaaS?', answer: 'Infrastructure as a Service – tillhandahåller virtualiserade beräkningsresurser via internet, t.ex. Azure Virtual Machines.' },
      { question: 'Vad innebär pay-as-you-go?', answer: 'Du betalar bara för de resurser du faktiskt använder, utan fasta avgifter.' },
      { question: 'Vad är Azure Blob Storage?', answer: 'En objektlagringstjänst för ostrukturerad data som bilder, videor och dokument.' },
      { question: 'Vad är en SLA?', answer: 'Service Level Agreement – ett avtal som garanterar en viss tillgänglighet och prestanda för en tjänst.' },
      { question: 'Vad är Azure AD?', answer: 'Azure Active Directory – en molnbaserad identitets- och åtkomsttjänst för autentisering och auktorisering.' },
      { question: 'Vad är serverless computing?', answer: 'En modell där kod körs utan att du behöver hantera underliggande servrar – t.ex. Azure Functions.' },
    ],

    mindmap: {
      id: 'root',
      topic: 'Molntjänster',
      children: [
        {
          id: 'models',
          topic: 'Tjänstemodeller',
          children: [
            { id: 'iaas', topic: 'IaaS', children: [] },
            { id: 'paas', topic: 'PaaS', children: [] },
            { id: 'saas', topic: 'SaaS', children: [] },
          ],
        },
        {
          id: 'azure',
          topic: 'Azure-tjänster',
          children: [
            { id: 'vm', topic: 'Virtual Machines', children: [] },
            { id: 'storage', topic: 'Blob Storage', children: [] },
            { id: 'sql', topic: 'Azure SQL', children: [] },
          ],
        },
        {
          id: 'deploy',
          topic: 'Driftsättning',
          children: [
            { id: 'private', topic: 'Privat moln', children: [] },
            { id: 'public', topic: 'Offentligt moln', children: [] },
            { id: 'hybrid', topic: 'Hybridmoln', children: [] },
          ],
        },
      ],
    },

    quiz_questions: [
      {
        question: 'Vilket betalningssätt är typiskt för molntjänster?',
        options: ['Pay-as-you-go', 'Årsavgift', 'Engångsköp', 'Gratis alltid'],
        correct_answer: 'Pay-as-you-go',
      },
      {
        question: 'Vilken Azure-tjänst hanterar identitet och åtkomst?',
        options: ['Azure AD', 'Azure VM', 'Azure SQL', 'Azure Functions'],
        correct_answer: 'Azure AD',
      },
      {
        question: 'Vad är PaaS?',
        options: [
          'Platform as a Service – en plattform för att bygga appar',
          'Payment as a Service',
          'Private as a Service',
          'Process as a Service',
        ],
        correct_answer: 'Platform as a Service – en plattform för att bygga appar',
      },
    ],
  };
}

// ─── Anthropic API-anrop [TODO] ──────────────────────────────────────────────

async function callAnthropic(_pdfText: string): Promise<GeneratedMaterial> {
  // TODO: Lägg till ANTHROPIC_API_KEY i Supabase secrets och implementera anropet här.
  // Exempelstruktur:
  //
  // const response = await fetch('https://api.anthropic.com/v1/messages', {
  //   method: 'POST',
  //   headers: {
  //     'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
  //     'anthropic-version': '2023-06-01',
  //     'content-type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     model: 'claude-opus-4-8-20251101',
  //     max_tokens: 8192,
  //     messages: [{
  //       role: 'user',
  //       content: `Analysera detta dokument och returnera JSON med fälten:
  //         summary (markdown), flashcards (array av {question, answer}),
  //         mindmap (träd med {id, topic, children}),
  //         quiz_questions (array av {question, options: string[], correct_answer}).\n\n${_pdfText}`,
  //     }],
  //   }),
  // });
  // const data = await response.json();
  // return JSON.parse(data.content[0].text);
  throw new Error('ANTHROPIC_API_KEY ej konfigurerad. Sätt MOCK_AI=true för testläge.');
}

// ─── Huvudfunktion ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader ?? '' } } },
    );

    const { document_id } = await req.json();
    if (!document_id) throw new Error('document_id saknas');

    // Hämta dokumentet (verifierar ägarskap via RLS)
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('*, courses(id, user_id)')
      .eq('id', document_id)
      .single();
    if (docErr || !doc) throw new Error('Dokumentet hittades inte');

    const courseId = (doc.courses as { id: string; user_id: string }).id;
    const userId = (doc.courses as { id: string; user_id: string }).user_id;

    // Generera studiematerial (mock eller riktigt)
    const mockMode = Deno.env.get('MOCK_AI') === 'true';
    let material: GeneratedMaterial;

    if (mockMode) {
      material = getMockMaterial();
    } else {
      // Hämta PDF från Storage och extrahera text
      const { data: fileData, error: fileErr } = await supabase.storage
        .from('documents')
        .download(doc.storage_path);
      if (fileErr || !fileData) throw new Error('PDF-hämtning misslyckades');
      // TODO: PDF-textextrahering – lägg till en PDF-parser här
      const pdfText = `[PDF-innehåll från ${doc.name}]`;
      material = await callAnthropic(pdfText);
    }

    // Spara sammanfattning
    await supabase.from('summaries').insert({
      course_id: courseId,
      document_id,
      user_id: userId,
      content: material.summary,
    });

    // Spara flashkort
    if (material.flashcards.length > 0) {
      await supabase.from('flashcards').insert(
        material.flashcards.map((f) => ({
          course_id: courseId,
          document_id,
          user_id: userId,
          question: f.question,
          answer: f.answer,
        })),
      );
    }

    // Spara mindmap
    await supabase.from('mindmaps').upsert({
      course_id: courseId,
      document_id,
      user_id: userId,
      content: material.mindmap,
    });

    // Spara quizfrågor
    if (material.quiz_questions.length > 0) {
      await supabase.from('quiz_questions').insert(
        material.quiz_questions.map((q) => ({
          course_id: courseId,
          document_id,
          user_id: userId,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
        })),
      );
    }

    // Markera dokumentet som genererat
    await supabase
      .from('documents')
      .update({ generated_at: new Date().toISOString() })
      .eq('id', document_id);

    return new Response(JSON.stringify({ success: true, mock: mockMode }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
