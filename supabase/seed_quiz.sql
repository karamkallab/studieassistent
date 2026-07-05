-- ============================================================
-- Seed: 10 quizfrågor om molntjänster / Azure
-- Kör efter migration_v3_quiz.sql och efter att en kurs skapats i appen.
-- Frågorna kopplas till den senast skapade kursen.
-- ============================================================

WITH target AS (
  SELECT id, user_id FROM courses ORDER BY created_at DESC LIMIT 1
)
INSERT INTO quiz_questions (course_id, user_id, question, options, correct_answer)
SELECT t.id, t.user_id, q.question, q.options::jsonb, q.correct_answer
FROM target t,
(VALUES
  (
    'Vad är molnberäkning (cloud computing)?',
    '["Leverans av IT-resurser via internet på begäran","Lokal installation av servrar","En typ av operativsystem","Ett nätverksprotokoll"]',
    'Leverans av IT-resurser via internet på begäran'
  ),
  (
    'Vilket av följande är ett exempel på IaaS?',
    '["Azure Virtual Machines","Microsoft 365","Azure SQL Database","Azure App Service"]',
    'Azure Virtual Machines'
  ),
  (
    'Vad är Azure Blob Storage?',
    '["Objektlagring för ostrukturerad data","En relationsdatabas","En meddelandetjänst","En containertjänst"]',
    'Objektlagring för ostrukturerad data'
  ),
  (
    'Vad kallas betalningsmodellen "betala för det du använder"?',
    '["Pay-as-you-go","Flat rate","Prenumeration","Licensmodell"]',
    'Pay-as-you-go'
  ),
  (
    'Vad är Azure Kubernetes Service (AKS)?',
    '["En hanterad tjänst för att köra containers","En databastjänst","En nätverkstjänst","En AI-plattform"]',
    'En hanterad tjänst för att köra containers'
  ),
  (
    'Vilken molnmodell ger användaren mest kontroll över infrastrukturen?',
    '["Privat moln (Private Cloud)","Offentligt moln (Public Cloud)","Hybridmoln","Community Cloud"]',
    'Privat moln (Private Cloud)'
  ),
  (
    'Vad innebär "serverless computing"?',
    '["Kod körs utan att du hanterar servrar","Det finns inga servrar alls","Servrar är gratis","Servrar är fysiskt borttagna"]',
    'Kod körs utan att du hanterar servrar'
  ),
  (
    'Vad är Azure Active Directory (Azure AD)?',
    '["En molnbaserad identitets- och åtkomsttjänst","En filserver","En nätverksfirewall","En databastjänst"]',
    'En molnbaserad identitets- och åtkomsttjänst'
  ),
  (
    'Vad mäter ett SLA (Service Level Agreement)?',
    '["Garanterad tillgänglighet och prestanda för en tjänst","Priset på en tjänst","Antalet användare","Lagringskapaciteten"]',
    'Garanterad tillgänglighet och prestanda för en tjänst'
  ),
  (
    'Vad är syftet med Azure Load Balancer?',
    '["Fördela nätverkstrafik mellan flera servrar","Lagra stora filer","Hantera DNS","Kryptera data"]',
    'Fördela nätverkstrafik mellan flera servrar'
  )
) AS q(question, options, correct_answer);
