// src/lib/utils/generateInvoicePdf.ts
// Génération de facture PDF côté client avec jsPDF
// npm install jspdf

import jsPDF from 'jspdf';
import { Subscription } from '@/types';
import { GBA_LOGO_BASE64 } from './logo'; // Importer le logo

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantInfo {
  /** Nom de la société ou de l'entrepreneur */
  companyName: string;
  /** Sous-titre / statut légal (ex: "Freelance - Entrepreneur Individuel") */
  legalStatus?: string;
  /** Numéro SIREN/SIRET */
  sirenSiret?: string;
  /** Adresse complète */
  address1?: string;
  address2?: string;
  /** Téléphone */
  phone?: string;
  /** Email */
  email?: string;
  /** Nom du contact principal */
  contactName?: string;
  /** Mention TVA (laissez vide pour auto-mention art. 293B) */
  vatMention?: string;
}

export interface InvoiceOptions {
  /** Numéro de facture (utilise functional_id si absent) */
  invoiceNumber?: string;
  /** Logo en base64 (data:image/png;base64,...) */
  logoBase64?: string;
}

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const COLORS = {
  gold: [217, 202, 65] as [number, number, number],       // #D9CA41 – en-tête tableaux
  goldLight: [245, 242, 200] as [number, number, number], // fond lignes alternées
  dark: [30, 30, 30] as [number, number, number],
  gray: [120, 120, 120] as [number, number, number],
  lightGray: [240, 240, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  primary: [37, 99, 235] as [number, number, number],     // bleu pour montants
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | Date, locale = 'fr-FR'): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} €`;
}

function zeroPad(num: number, size = 3): string {
  return String(num).padStart(size, '0');
}

// ─── Générateur principal ──────────────────────────────────────────────────────

/**
 * Génère un PDF de facture fidèle au modèle Excel et le télécharge automatiquement.
 * ✅ Utilise maintenant le functional_id comme numéro de facture par défaut
 *
 * @param subscription  - Données de la souscription
 * @param tenant        - Informations de l'entreprise prestataire
 * @param options       - Options supplémentaires (logo, numéro de facture…)
 */
export function generateInvoicePdf(
  subscription: Subscription,
  tenant: TenantInfo,
  options: InvoiceOptions = {}
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Dimensions page
  const PW = doc.internal.pageSize.getWidth();   // 210 mm
  const PH = doc.internal.pageSize.getHeight();  // 297 mm
  const MARGIN = 15;
  const CONTENT_W = PW - MARGIN * 2;

  // ── Numéro de facture ───────────────────────────────────────────────────────
  // ✅ CHANGEMENT : Utilise functional_id par défaut au lieu de subscription.id
  //const invoiceNumber = options.invoiceNumber ?? 
    //subscription.functionalId ?? 
    //zeroPad(subscription.id ? parseInt(subscription.id.slice(-3), 16) : 1);
    const invoiceNumber = subscription.functionalId;
  // ── Montant ─────────────────────────────────────────────────────────────────
  const amount = Number(subscription.paymentAmount) || 0;

  // ── Description de la prestation ────────────────────────────────────────────
   const description = `Abonnement ${subscription.offerName} du ${subscription.subscriptionStartDate} au ${subscription.subscriptionEndDate} (${subscription.daysSubscribed} jours)`;


  // ═══════════════════════════════════════════════════════════════════════════
  // 1. EN-TÊTE — logo + titre FACTURE
  // ═══════════════════════════════════════════════════════════════════════════

  // Déterminer quel logo utiliser : celui passé en option ou celui par défaut
  const logoToUse = options.logoBase64 || GBA_LOGO_BASE64;

  if (logoToUse) {
    try {
      // Utilisation impérative du format 'JPEG' car votre base64 commence par data:image/jpeg
      doc.addImage(logoToUse, 'JPEG', MARGIN, 10, 45, 20);
    } catch (e) {
      console.error("Erreur lors de l'insertion du logo:", e);
    }
  } else {
    // Ce bloc ne s'exécutera que si GBA_LOGO_BASE64 est aussi vide
    doc.setFillColor(...COLORS.lightGray);
    doc.roundedRect(MARGIN, 12, 40, 20, 2, 2, 'F');
  }

  // Titre "Facture" (droite) – grande police
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Facture', PW - MARGIN, 26, { align: 'right' });

  const headerBottom = 36;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. IDENTITÉ PRESTATAIRE (gauche) + MÉTA-DONNÉES FACTURE (droite)
  // ═══════════════════════════════════════════════════════════════════════════

  let leftY = headerBottom + 4;
  let rightY = headerBottom + 4;

  // — Prestataire —
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text("Giselle Brand Agency", MARGIN, leftY);

  leftY += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  
  doc.text("Entreprise Individuelle", MARGIN, leftY);
  leftY += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  
  doc.text("SIREN/SIRET : 999327844", MARGIN, leftY);
  leftY += 5;

  // — Méta-données (date / n° / id client) —
  const META_LABEL_X = PW - MARGIN - 55;
  const META_VALUE_X = PW - MARGIN;

  const metaRows: [string, string][] = [
    ['Date :', formatDate(subscription.paymentDate)],
    ['Facture # :', invoiceNumber],
    ['Client :', tenant.companyName],
  ];

  for (const [label, value] of metaRows) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(label, META_LABEL_X, rightY, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(value, META_VALUE_X, rightY, { align: 'right' });
    rightY += 5;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. BLOC "POUR" — Destinataire (client)
  // ═══════════════════════════════════════════════════════════════════════════

  const billingY = Math.max(leftY, rightY) + 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('Pour :', MARGIN + 20, billingY, { align: 'right' });

  const clientLines: string[] = [];
  if (tenant.companyName) clientLines.push(tenant.companyName);
  if (tenant.address1) clientLines.push(tenant.address1);
  if (tenant.address2) clientLines.push(tenant.address2);
  if (tenant.phone) clientLines.push(tenant.phone);
  if (tenant.email) clientLines.push(tenant.email);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  let clientY = billingY;
  for (const line of clientLines) {
    doc.text(line, MARGIN + 22, clientY);
    clientY += 4.5;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TABLEAU "NOM / POSTE / CONDITIONS DE PAIEMENT / DATE"
  // ═══════════════════════════════════════════════════════════════════════════

  const TABLE1_Y = Math.max(clientY, billingY) + 6;
  const ROW_H = 8;
  const TABLE1_COLS = [50,  60, 30]; // largeurs colonnes
  const TABLE1_HEADERS = ['NOM',  'CONDITIONS DE PAIEMENT', 'DATE'];

  // En-tête jaune
  _drawTableHeader(doc, MARGIN, TABLE1_Y, TABLE1_COLS, TABLE1_HEADERS);

  // Ligne de données
  const paymentCondition = _mapPaymentMethod(subscription.paymentMethod);
  const dueDate = formatDate(subscription.paymentDate);

  _drawTableRow(doc, MARGIN, TABLE1_Y + ROW_H, TABLE1_COLS, [
    tenant.companyName,
    paymentCondition,
    dueDate,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. TABLEAU "QUANTITÉ / DESCRIPTION / PRIX UNITAIRE / TOTAL"
  // ═══════════════════════════════════════════════════════════════════════════

  const TABLE2_Y = TABLE1_Y + ROW_H * 2 + 8;
  const TABLE2_COLS = [15, 95, 35, 35];
  const TABLE2_HEADERS = ['QTÉ', 'DESCRIPTION', 'PRIX UNITAIRE', 'TOTAL'];

  _drawTableHeader(doc, MARGIN, TABLE2_Y, TABLE2_COLS, TABLE2_HEADERS);

  // Ligne de prestation
  _drawTableRow(doc, MARGIN, TABLE2_Y + ROW_H, TABLE2_COLS, [
    '1',
    description,
    subscription.offerName,
    formatCurrency(amount),
    formatCurrency(amount),
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. BLOC TOTAUX (droite)
  // ═══════════════════════════════════════════════════════════════════════════

  const TOTAL_Y = TABLE2_Y + ROW_H * 2 + 4;

  // Dans la section 6. BLOC TOTAUX
  const TOTAL_VALUE_X = PW - MARGIN; // Reste correct (195mm)
  const TOTAL_LABEL_X = TOTAL_VALUE_X - 35; // Aligné sur la colonne TOTAL

  const totalsRows: [string, string, boolean][] = [
    ['Total HT', formatCurrency(amount), false],
    ['TVA*', 'N.A.', false],
    ['Total TTC', formatCurrency(amount), true],
  ];

  let totalRowY = TOTAL_Y;
  for (const [label, value, isBold] of totalsRows) {
    // Fond sur ligne Total TTC
    if (isBold) {
      doc.setFillColor(...COLORS.gold);
      doc.rect(TOTAL_LABEL_X +5, totalRowY - 5, 40 + 4 + 4, 7, 'F');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...COLORS.dark);
    doc.text(label, TOTAL_LABEL_X, totalRowY, { align: 'right' });

    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(isBold ? COLORS.primary[0] : COLORS.dark[0], isBold ? COLORS.primary[1] : COLORS.dark[1], isBold ? COLORS.primary[2] : COLORS.dark[2]);
    doc.text(value, TOTAL_VALUE_X, totalRowY, { align: 'right' });

    totalRowY += 7;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. MENTION TVA
  // ═══════════════════════════════════════════════════════════════════════════

  const vatY = totalRowY + 4;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.gray);
  const vatText =
    tenant.vatMention ??
    "*TVA non applicable, en application de l'article 293B du Code Général des Impôts";
  const vatLines = doc.splitTextToSize(vatText, CONTENT_W);
  doc.text(vatLines, MARGIN, vatY);

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. PIED DE PAGE — "MERCI !" + coordonnées
  // ═══════════════════════════════════════════════════════════════════════════

  const FOOTER_Y = PH - 28;

  // Trait de séparation
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, FOOTER_Y - 4, PW - MARGIN, FOOTER_Y - 4);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('MERCI !', PW / 2, FOOTER_Y + 4, { align: 'center' });

  // Coordonnées
  const footerParts: string[] = [];
  footerParts.push("Giselle Brand Agency - Palavas-Les-Flots - hello.gisellebrandagency@outlook.fr");

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(footerParts.join('  •  '), PW / 2, FOOTER_Y + 10, { align: 'center' });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. TÉLÉCHARGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // ✅ CHANGEMENT : Utilise functional_id dans le nom du fichier
  const filename = `Facture_${invoiceNumber}_${subscription.offerName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

function _drawTableHeader(
  doc: jsPDF,
  x: number,
  y: number,
  cols: number[],
  headers: string[]
): void {
  const ROW_H = 8;
  let cx = x;

  for (let i = 0; i < cols.length; i++) {
    // Fond jaune
    doc.setFillColor(...COLORS.gold);
    doc.rect(cx, y, cols[i], ROW_H, 'F');

    // Bordure
    doc.setDrawColor(200, 190, 40);
    doc.setLineWidth(0.2);
    doc.rect(cx, y, cols[i], ROW_H, 'S');

    // Texte centré
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(headers[i], cx + cols[i] / 2, y + 5.2, { align: 'center' });

    cx += cols[i];
  }
}

function _drawTableRow(
  doc: jsPDF,
  x: number,
  y: number,
  cols: number[],
  values: string[]
): void {
  const ROW_H = 8;
  let cx = x;

  for (let i = 0; i < cols.length; i++) {
    doc.setFillColor(...COLORS.white);
    doc.rect(cx, y, cols[i], ROW_H, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.rect(cx, y, cols[i], ROW_H, 'S');

    doc.setFontSize(8); // Taille légèrement réduite pour la sécurité
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.dark);

    // Détermination de l'alignement
    const align = (i === 0 || i === 1) ? 'left' : 'right';
    const textX = align === 'left' ? cx + 2 : cx + cols[i] - 2;

    // Gestion du texte long (Description)
    const maxWidth = cols[i] - 4;
    const textLines = doc.splitTextToSize(values[i], maxWidth);
    
    // On n'affiche que la première ligne si ça dépasse, 
    // ou on réduit la police si c'est la description
    if (textLines.length > 1 && i === 1) {
        doc.setFontSize(7);
    }
    
    doc.text(textLines[0], textX, y + 5.2, { align });

    cx += cols[i];
  }
}

function _mapPaymentMethod(method?: string): string {
  const map: Record<string, string> = {
    carte_bancaire: 'Carte bancaire',
    virement: 'Virement bancaire',
    prelevement: 'Prélèvement automatique',
    cheque: 'Chèque',
    non_specifie: 'Dû à réception de la facture',
  };
  return map[method ?? ''] ?? 'Dû à réception de la facture';
}