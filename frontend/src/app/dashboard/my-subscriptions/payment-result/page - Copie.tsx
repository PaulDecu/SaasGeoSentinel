'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { paymentsApi } from '@/lib/api/resources';

type PaymentStatus = 'loading' | 'paid' | 'failed' | 'canceled' | 'expired' | 'unknown';

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {

    console.log('searchParams paymentId:', searchParams.get('paymentId'));
  console.log('sessionStorage paymentId:', sessionStorage.getItem('pendingPaymentId'));

    // Lecture du paymentId uniquement côté client (après montage)
    const paymentId =
      searchParams.get('paymentId') ||
      sessionStorage.getItem('pendingPaymentId');

      console.log('paymentId final utilisé:', paymentId);

    if (!paymentId) {
      setStatus('unknown');
      return;
    }

    pollStatus(paymentId, 0);
  }, []);

  const pollStatus = async (id: string, attempt: number) => {
    if (attempt >= 12) {
      setStatus('unknown');
      return;
    }
    try {
      const data = await paymentsApi.getStatus(id);
      const s = data.status;

      if (s === 'paid') {
        sessionStorage.removeItem('pendingPaymentId');
        setStatus('paid');
        return;
      }
      if (['failed', 'canceled', 'expired'].includes(s)) {
        sessionStorage.removeItem('pendingPaymentId');
        setStatus(s as PaymentStatus);
        return;
      }

      setAttempts(attempt + 1);
      setTimeout(() => pollStatus(id, attempt + 1), 2500);
    } catch {
      setTimeout(() => pollStatus(id, attempt + 1), 2500);
    }
  };

  const config: Record<PaymentStatus, {
    icon: string;
    title: string;
    message: string;
    accent: string;
    bg: string;
    ring: string;
    btnLabel: string;
  }> = {
    loading: {
      icon: '⏳',
      title: 'Vérification en cours…',
      message: 'Nous confirmons votre paiement auprès de Mollie.',
      accent: 'text-amber-600',
      bg: 'bg-amber-50',
      ring: 'ring-amber-200',
      btnLabel: '',
    },
    paid: {
      icon: '✅',
      title: 'Paiement confirmé !',
      message: 'Votre abonnement a été activé avec succès. Merci pour votre confiance.',
      accent: 'text-emerald-700',
      bg: 'bg-emerald-50',
      ring: 'ring-emerald-200',
      btnLabel: 'Voir mon offre',
    },
    failed: {
      icon: '❌',
      title: 'Paiement échoué',
      message: "Votre paiement n'a pas pu être traité. Veuillez réessayer ou choisir un autre moyen de paiement.",
      accent: 'text-red-700',
      bg: 'bg-red-50',
      ring: 'ring-red-200',
      btnLabel: 'Retour à mes offres',
    },
    canceled: {
      icon: '🚫',
      title: 'Paiement annulé',
      message: "Vous avez annulé le paiement. Votre abonnement n'a pas été modifié.",
      accent: 'text-slate-700',
      bg: 'bg-slate-50',
      ring: 'ring-slate-200',
      btnLabel: 'Retour à mes offres',
    },
    expired: {
      icon: '⏰',
      title: 'Session expirée',
      message: 'Le délai de paiement a expiré. Veuillez recommencer depuis la page de vos offres.',
      accent: 'text-orange-700',
      bg: 'bg-orange-50',
      ring: 'ring-orange-200',
      btnLabel: 'Retour à mes offres',
    },
    unknown: {
      icon: '❓',
      title: 'Statut inconnu',
      message: "Nous n'avons pas pu confirmer le statut de votre paiement. Vérifiez vos abonnements.",
      accent: 'text-slate-700',
      bg: 'bg-slate-50',
      ring: 'ring-slate-200',
      btnLabel: 'Voir mes offres',
    },
  };

  const c = config[status];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className={`w-full max-w-md rounded-2xl shadow-xl ring-2 p-8 text-center transition-all duration-500 ${c.bg} ${c.ring}`}>
        <div className="text-7xl mb-6">{c.icon}</div>
        <h1 className={`text-2xl font-bold mb-3 ${c.accent}`}>{c.title}</h1>
        <p className="text-slate-600 text-sm leading-relaxed mb-8">{c.message}</p>

        {status === 'loading' && (
          <>
            <div className="flex justify-center gap-1.5 mb-6">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            {attempts > 0 && (
              <p className="text-xs text-slate-400 mb-6">Tentative {attempts} / 12…</p>
            )}
          </>
        )}

        {status !== 'loading' && (
          <button
            onClick={() => router.push('/my-offer')}
            className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 ${
              status === 'paid'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200'
                : 'bg-slate-800 hover:bg-slate-900 text-white shadow-md shadow-slate-300'
            }`}
          >
            {c.btnLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-500 text-sm animate-pulse">Chargement…</div>
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}