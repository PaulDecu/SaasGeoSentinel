// src/subscriptions/templates/subscription-emails.templates.ts

const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  max-width: 620px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.10);
`;

const footer = (frontendUrl: string) => `
  <div style="background:#f1f5f9;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;font-weight:600;letter-spacing:1px;text-transform:uppercase;">
      🛡️ GeoSentinel · Security & Risk Management
    </p>
    <p style="margin:0;font-size:11px;color:#cbd5e1;">
      Vous recevez cet email car vous êtes administrateur d'un espace GeoSentinel.<br>
      <a href="${frontendUrl}/me" style="color:#0891b2;text-decoration:none;">Gérer mes préférences</a>
    </p>
  </div>
`;

// ─── J-5 : Avertissement préventif ───────────────────────────────────────────
export function templateJMinus5(params: {
  companyName: string;
  adminEmail: string;
  endDate: string;
  daysRemaining: number;
  renewUrl: string;
  frontendUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `[GeoSentinel] Votre abonnement expire dans ${params.daysRemaining} jours`,
    html: `
<div style="${baseStyle}">
  <div style="background:linear-gradient(135deg,#0891b2 0%,#0e7490 100%);padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">🛡️</div>
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
      Votre abonnement arrive à échéance
    </h1>
    <p style="margin:8px 0 0;color:#bae6fd;font-size:15px;">
      Renouvellement recommandé pour assurer la continuité de votre protection
    </p>
  </div>

  <div style="padding:36px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Bonjour,<br><br>
      Nous vous contactons au nom de l'équipe <strong>GeoSentinel</strong> pour vous informer que l'abonnement
      de <strong>${params.companyName}</strong> expire dans <strong style="color:#0891b2;">${params.daysRemaining} jours</strong>,
      le <strong>${params.endDate}</strong>.
    </p>

    <div style="background:#f0f9ff;border-left:4px solid #0891b2;border-radius:6px;padding:20px 24px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#0c4a6e;line-height:1.6;">
        💡 <strong>Pourquoi renouveler maintenant ?</strong><br>
        Vos équipes terrain utilisent GeoSentinel quotidiennement pour surveiller les risques en temps réel.
        Un renouvellement anticipé vous garantit une continuité de service totale, sans interruption de vos alertes
        ni perte d'historique.
      </p>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="${params.renewUrl}" style="
        display:inline-block;
        background:linear-gradient(135deg,#0891b2,#0e7490);
        color:#ffffff;
        text-decoration:none;
        padding:14px 36px;
        border-radius:8px;
        font-weight:700;
        font-size:16px;
        letter-spacing:0.3px;
        box-shadow:0 4px 12px rgba(8,145,178,0.3);
      ">
        🔄 Renouveler mon abonnement
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
      Des questions ? Contactez-nous à <a href="mailto:support@geosentinel.fr" style="color:#0891b2;">support@geosentinel.fr</a>
    </p>
  </div>

  ${footer(params.frontendUrl)}
</div>`,
  };
}

// ─── J-1 : Alerte urgente ─────────────────────────────────────────────────────
export function templateJMinus1(params: {
  companyName: string;
  endDate: string;
  renewUrl: string;
  frontendUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `[URGENT] Votre abonnement GeoSentinel expire DEMAIN`,
    html: `
<div style="${baseStyle}">
  <div style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
      Expiration imminente — Action requise
    </h1>
    <p style="margin:8px 0 0;color:#fef3c7;font-size:15px;">
      Votre accès sera suspendu demain à minuit
    </p>
  </div>

  <div style="padding:36px 32px;">
    <div style="background:#fff7ed;border:2px solid #f59e0b;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0;font-size:15px;color:#92400e;font-weight:600;text-align:center;">
        🔔 L'abonnement de <strong>${params.companyName}</strong> expire le <strong>${params.endDate}</strong>
      </p>
    </div>

    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Passé cette date, l'accès à la plateforme GeoSentinel sera automatiquement suspendu :
    </p>

    <ul style="margin:0 0 24px;padding:0 0 0 20px;color:#475569;font-size:14px;line-height:2;">
      <li>Les agents terrain ne pourront plus recevoir d'alertes de proximité</li>
      <li>La carte des risques ne sera plus accessible</li>
      <li>Les données sont conservées et restituées dès renouvellement</li>
    </ul>

    <div style="text-align:center;margin:32px 0;">
      <a href="${params.renewUrl}" style="
        display:inline-block;
        background:linear-gradient(135deg,#f59e0b,#d97706);
        color:#ffffff;
        text-decoration:none;
        padding:16px 40px;
        border-radius:8px;
        font-weight:800;
        font-size:17px;
        box-shadow:0 4px 16px rgba(245,158,11,0.4);
      ">
        ⚡ Renouveler maintenant
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
      Le renouvellement prend moins de 2 minutes.
    </p>
  </div>

  ${footer(params.frontendUrl)}
</div>`,
  };
}

// ─── J0 : Jour d'expiration ───────────────────────────────────────────────────
export function templateJ0(params: {
  companyName: string;
  endDate: string;
  renewUrl: string;
  frontendUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `[GeoSentinel] Votre accès est suspendu aujourd'hui`,
    html: `
<div style="${baseStyle}">
  <div style="background:linear-gradient(135deg,#ef4444 0%,#b91c1c 100%);padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">🔒</div>
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
      Service suspendu — Abonnement échu
    </h1>
    <p style="margin:8px 0 0;color:#fecaca;font-size:15px;">
      Votre protection GeoSentinel est interrompue
    </p>
  </div>

  <div style="padding:36px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Bonjour,<br><br>
      L'abonnement de <strong>${params.companyName}</strong> a expiré ce jour, le <strong>${params.endDate}</strong>.
      L'accès à GeoSentinel est désormais suspendu pour l'ensemble de vos utilisateurs.
    </p>

    <div style="background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:20px 24px;margin:24px 0;">
      <p style="margin:0 0 12px;font-size:14px;color:#991b1b;font-weight:700;">🔴 Services actuellement indisponibles :</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#7f1d1d;font-size:14px;line-height:2;">
        <li>Alertes de proximité pour les agents terrain</li>
        <li>Accès à la carte des risques en temps réel</li>
        <li>Gestion et création de nouveaux risques</li>
      </ul>
    </div>

    <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:6px;padding:16px 20px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#14532d;line-height:1.6;">
        ✅ <strong>Bonne nouvelle :</strong> Vos données sont intégralement conservées.
        Un renouvellement aujourd'hui vous rétablit l'accès immédiatement, sans perte d'historique.
      </p>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="${params.renewUrl}" style="
        display:inline-block;
        background:linear-gradient(135deg,#22c55e,#16a34a);
        color:#ffffff;
        text-decoration:none;
        padding:16px 40px;
        border-radius:8px;
        font-weight:800;
        font-size:17px;
        box-shadow:0 4px 16px rgba(34,197,94,0.35);
      ">
        🔓 Réactiver mon accès
      </a>
    </div>
  </div>

  ${footer(params.frontendUrl)}
</div>`,
  };
}

// ─── J+10 : Première relance post-échéance ────────────────────────────────────
export function templateJPlus10(params: {
  companyName: string;
  endDate: string;
  renewUrl: string;
  frontendUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `[GeoSentinel] Votre espace vous attend — Reprise possible à tout moment`,
    html: `
<div style="${baseStyle}">
  <div style="background:linear-gradient(135deg,#6366f1 0%,#4338ca 100%);padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">💬</div>
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
      Nous espérons vous retrouver bientôt
    </h1>
    <p style="margin:8px 0 0;color:#c7d2fe;font-size:15px;">
      Votre espace GeoSentinel est en attente depuis 10 jours
    </p>
  </div>

  <div style="padding:36px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Bonjour,<br><br>
      Cela fait maintenant 10 jours que l'abonnement de <strong>${params.companyName}</strong> a expiré
      (le <strong>${params.endDate}</strong>). Vos données sont toujours intégralement conservées
      et vos équipes peuvent reprendre l'activité à tout moment.
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Votre retour nous importe. Y a-t-il une raison particulière à cette interruption ?
      Un problème technique, une question sur notre offre, ou simplement un besoin de délai ?
      <strong>Notre équipe est disponible pour vous aider.</strong>
    </p>

    <div style="background:#eef2ff;border-radius:8px;padding:20px 24px;margin:24px 0;">
      <p style="margin:0 0 12px;font-size:14px;color:#3730a3;font-weight:700;">Nous pouvons vous proposer :</p>
      <ul style="margin:0;padding:0 0 0 18px;color:#4338ca;font-size:14px;line-height:2;">
        <li>Un accompagnement personnalisé pour le renouvellement</li>
        <li>Une démonstration des nouvelles fonctionnalités</li>
        <li>Un devis adapté à vos besoins actuels</li>
      </ul>
    </div>

    <div style="display:flex;gap:12px;justify-content:center;margin:32px 0;flex-wrap:wrap;">
      <a href="${params.renewUrl}" style="
        display:inline-block;
        background:linear-gradient(135deg,#6366f1,#4338ca);
        color:#ffffff;
        text-decoration:none;
        padding:14px 28px;
        border-radius:8px;
        font-weight:700;
        font-size:15px;
      ">
        🔄 Renouveler mon abonnement
      </a>
      <a href="mailto:support@geosentinel.fr?subject=Question abonnement ${params.companyName}" style="
        display:inline-block;
        background:#f1f5f9;
        color:#475569;
        text-decoration:none;
        padding:14px 28px;
        border-radius:8px;
        font-weight:700;
        font-size:15px;
        border:2px solid #e2e8f0;
      ">
        ✉️ Contacter le support
      </a>
    </div>
  </div>

  ${footer(params.frontendUrl)}
</div>`,
  };
}

// ─── J+30 : Dernière relance avant archivage ──────────────────────────────────
export function templateJPlus30(params: {
  companyName: string;
  endDate: string;
  archiveDate: string;
  renewUrl: string;
  frontendUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `[GeoSentinel] Dernière notification — Archivage de vos données prévu le ${params.archiveDate}`,
    html: `
<div style="${baseStyle}">
  <div style="background:linear-gradient(135deg,#334155 0%,#0f172a 100%);padding:36px 32px;text-align:center;">
    <div style="font-size:48px;margin-bottom:12px;">📦</div>
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
      Avis d'archivage de vos données
    </h1>
    <p style="margin:8px 0 0;color:#94a3b8;font-size:15px;">
      Action requise avant le ${params.archiveDate}
    </p>
  </div>

  <div style="padding:36px 32px;">
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Bonjour,<br><br>
      Il y a 30 jours, l'abonnement de <strong>${params.companyName}</strong> a pris fin (le <strong>${params.endDate}</strong>).
      Conformément à notre politique de gestion des données, nous vous adressons ce dernier avis
      avant l'archivage de votre espace.
    </p>

    <div style="background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:20px 24px;margin:24px 0;">
      <p style="margin:0 0 10px;font-size:14px;color:#991b1b;font-weight:700;">
        🗓️ Date d'archivage prévue : <strong>${params.archiveDate}</strong>
      </p>
      <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.6;">
        Passé cette date, vos données (risques, historiques, configuration) seront archivées
        et ne seront plus accessibles en ligne. Un renouvellement avant cette date vous
        permet de reprendre l'activité sans aucune perte.
      </p>
    </div>

    <div style="background:#f8fafc;border-radius:8px;padding:20px 24px;margin:24px 0;border:1px solid #e2e8f0;">
      <p style="margin:0 0 12px;font-size:14px;color:#475569;font-weight:600;">
        Ce que contient votre espace GeoSentinel :
      </p>
      <ul style="margin:0;padding:0 0 0 18px;color:#64748b;font-size:14px;line-height:2;">
        <li>L'ensemble de votre cartographie des risques</li>
        <li>L'historique des alertes et positions de vos agents</li>
        <li>La configuration de vos tournées et paramètres</li>
        <li>Les comptes et profils de vos utilisateurs</li>
      </ul>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="${params.renewUrl}" style="
        display:inline-block;
        background:linear-gradient(135deg,#334155,#0f172a);
        color:#ffffff;
        text-decoration:none;
        padding:16px 44px;
        border-radius:8px;
        font-weight:800;
        font-size:17px;
        box-shadow:0 4px 20px rgba(15,23,42,0.3);
      ">
        🔓 Conserver et réactiver mon accès
      </a>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.8;">
      Pour toute question ou demande particulière (export de données, délai supplémentaire),<br>
      contactez-nous directement : <a href="mailto:support@geosentinel.fr" style="color:#0891b2;">support@geosentinel.fr</a>
    </p>
  </div>

  ${footer(params.frontendUrl)}
</div>`,
  };
}
