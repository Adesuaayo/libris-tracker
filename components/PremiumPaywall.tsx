import { memo, useState, useEffect } from 'react';
import { X, Crown, Check, Sparkles, Zap, Shield } from 'lucide-react';
import { PremiumState, PREMIUM_FEATURES } from '../types';

interface PremiumPaywallProps {
  premiumState: PremiumState;
  onUpgrade: (tier: 'premium' | 'lifetime') => void;
  onClose: () => void;
}

export const PremiumPaywall = memo<PremiumPaywallProps>(({
  premiumState,
  onUpgrade,
  onClose
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSubscribe = () => {
    if (selectedPlan === 'lifetime') {
      onUpgrade('lifetime');
    } else {
      onUpgrade('premium');
    }
  };

  const plans = [
    {
      id: 'monthly' as const,
      label: 'Monthly',
      price: '$4.99',
      period: '/month',
      savings: null,
    },
    {
      id: 'yearly' as const,
      label: 'Yearly',
      price: '$29.99',
      period: '/year',
      savings: 'Save 50%',
    },
    {
      id: 'lifetime' as const,
      label: 'Lifetime',
      price: '$79.99',
      period: 'one-time',
      savings: 'Best Value',
    },
  ];

  return (
    <div className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center transition-all duration-200 ${visible ? 'bg-black/60' : 'bg-black/0'}`}>
      <div
        className={`bg-surface-card w-full max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Header */}
        <div
          className="relative px-6 pt-8 pb-6 text-center"
          style={{
            background: 'linear-gradient(135deg, #7C5CFC 0%, #9B8AFB 50%, #C084FC 100%)',
          }}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Unlock Libris Premium</h2>
          <p className="text-white/80 text-sm">Elevate your reading experience</p>

          {premiumState.trialAiUsesRemaining > 0 && premiumState.tier === 'free' && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs text-white backdrop-blur-sm">
              <Sparkles className="w-3 h-3" />
              {premiumState.trialAiUsesRemaining} free AI {premiumState.trialAiUsesRemaining === 1 ? 'use' : 'uses'} remaining
            </div>
          )}
        </div>

        {/* Features */}
        <div className="px-6 py-5">
          <div className="space-y-3 mb-6">
            {PREMIUM_FEATURES.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0">{feature.icon}</span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{feature.title}</p>
                  <p className="text-xs text-text-muted">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Plan Selection */}
          <div className="space-y-2.5 mb-5">
            {plans.map(plan => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                  selectedPlan === plan.id
                    ? 'border-accent bg-accent/5'
                    : 'border-surface-border hover:border-accent/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPlan === plan.id ? 'border-accent bg-accent' : 'border-surface-border'
                    }`}
                  >
                    {selectedPlan === plan.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary">{plan.label}</p>
                    <p className="text-xs text-text-muted">{plan.period}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-text-primary">{plan.price}</p>
                  {plan.savings && (
                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                      {plan.savings}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Subscribe Button */}
          <button
            onClick={handleSubscribe}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-base transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #7C5CFC 0%, #9B8AFB 100%)',
              boxShadow: '0 4px 20px rgba(124, 92, 252, 0.4)',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5" />
              {selectedPlan === 'lifetime' ? 'Unlock Forever' : 'Start Premium'}
            </div>
          </button>

          {/* Restore & Legal */}
          <div className="mt-4 text-center space-y-2">
            <p className="text-xs text-accent font-medium">Billing launching soon — you'll be first to know!</p>
            <div className="flex items-center justify-center gap-1 text-[10px] text-text-muted">
              <Shield className="w-3 h-3" />
              <span>Cancel anytime · Secure payment</span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              {selectedPlan === 'monthly' && 'Subscription renews monthly. Cancel anytime in your account settings.'}
              {selectedPlan === 'yearly' && 'Subscription renews yearly. Cancel anytime in your account settings.'}
              {selectedPlan === 'lifetime' && 'One-time purchase. Lifetime access, no recurring charges.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

PremiumPaywall.displayName = 'PremiumPaywall';
