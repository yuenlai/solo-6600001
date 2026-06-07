import React, { useEffect, useRef, useState } from 'react';
import { useWhiteboardStore } from '../store/whiteboard';
import { OnboardingStep } from '../types';

export const OnboardingTour: React.FC = () => {
  const {
    showOnboarding,
    onboardingStepIndex,
    getOnboardingSteps,
    nextOnboardingStep,
    prevOnboardingStep,
    completeOnboarding,
    setShowOnboarding,
  } = useWhiteboardStore();

  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const steps = getOnboardingSteps();
  const currentStep = steps[onboardingStepIndex];

  useEffect(() => {
    if (!showOnboarding || !currentStep?.highlightSelector) {
      setHighlightRect(null);
      return;
    }

    const updateHighlight = () => {
      const element = document.querySelector(currentStep.highlightSelector!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
      } else {
        setHighlightRect(null);
      }
    };

    updateHighlight();
    const interval = setInterval(updateHighlight, 100);
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight);
    };
  }, [showOnboarding, currentStep?.highlightSelector, onboardingStepIndex]);

  useEffect(() => {
    if (!showOnboarding || !tooltipRef.current) return;

    const updateTooltipPosition = () => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let top = 0;
      let left = 0;

      if (highlightRect) {
        const position = currentStep.position || 'bottom';
        const padding = 16;

        switch (position) {
          case 'top':
            top = highlightRect.top - tooltipHeight - padding;
            left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
            break;
          case 'bottom':
            top = highlightRect.bottom + padding;
            left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
            break;
          case 'left':
            top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
            left = highlightRect.left - tooltipWidth - padding;
            break;
          case 'right':
            top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
            left = highlightRect.right + padding;
            break;
        }
      } else {
        top = windowHeight / 2 - tooltipHeight / 2;
        left = windowWidth / 2 - tooltipWidth / 2;
      }

      top = Math.max(20, Math.min(top, windowHeight - tooltipHeight - 20));
      left = Math.max(20, Math.min(left, windowWidth - tooltipWidth - 20));

      setTooltipPosition({ top, left });
    };

    const timer = setTimeout(updateTooltipPosition, 50);
    window.addEventListener('resize', updateTooltipPosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTooltipPosition);
    };
  }, [showOnboarding, highlightRect, currentStep, onboardingStepIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showOnboarding) return;
      if (e.key === 'Escape') {
        completeOnboarding();
      } else if (e.key === 'ArrowRight') {
        if (onboardingStepIndex < steps.length - 1) {
          nextOnboardingStep();
        } else {
          completeOnboarding();
        }
      } else if (e.key === 'ArrowLeft') {
        if (onboardingStepIndex > 0) {
          prevOnboardingStep();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOnboarding, onboardingStepIndex, steps.length, nextOnboardingStep, prevOnboardingStep, completeOnboarding]);

  if (!showOnboarding) return null;

  const isFirstStep = onboardingStepIndex === 0;
  const isLastStep = onboardingStepIndex === steps.length - 1;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <defs>
          <mask id="onboarding-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - 4}
                y={highlightRect.top - 4}
                width={highlightRect.width + 8}
                height={highlightRect.height + 8}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#onboarding-mask)"
        />
        {highlightRect && (
          <rect
            x={highlightRect.left - 4}
            y={highlightRect.top - 4}
            width={highlightRect.width + 8}
            height={highlightRect.height + 8}
            rx="12"
            ry="12"
            fill="none"
            stroke="#667eea"
            strokeWidth="3"
            style={{
              animation: 'pulse-highlight 2s ease-in-out infinite',
            }}
          />
        )}
      </svg>

      <div
        ref={tooltipRef}
        style={{
          position: 'absolute',
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 20px rgba(0, 0, 0, 0.15)',
          padding: '24px',
          maxWidth: '380px',
          pointerEvents: 'auto',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '36px',
            lineHeight: 1,
          }}>
            {currentStep.icon}
          </div>
          <h3 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: '#1a1a1a',
          }}>
            {currentStep.title}
          </h3>
        </div>

        <p style={{
          margin: 0,
          fontSize: '14px',
          lineHeight: 1.6,
          color: '#4b5563',
          marginBottom: '20px',
        }}>
          {currentStep.description}
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '6px',
          marginBottom: '16px',
        }}>
          {steps.map((_: OnboardingStep, index: number) => (
            <div
              key={index}
              style={{
                width: index === onboardingStepIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: index === onboardingStepIndex
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#e5e7eb',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              onClick={() => useWhiteboardStore.getState().setOnboardingStepIndex(index)}
            />
          ))}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}>
          <button
            onClick={() => setShowOnboarding(false)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: '#6b7280',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            跳过引导
          </button>

          <div style={{
            display: 'flex',
            gap: '8px',
          }}>
            {!isFirstStep && (
              <button
                onClick={prevOnboardingStep}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
              >
                上一步
              </button>
            )}
            <button
              onClick={() => {
                if (isLastStep) {
                  completeOnboarding();
                } else {
                  nextOnboardingStep();
                }
              }}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              {isLastStep ? '开始使用' : '下一步'}
            </button>
          </div>
        </div>

        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #f3f4f6',
          fontSize: '11px',
          color: '#9ca3af',
          textAlign: 'center',
        }}>
          按 <kbd style={{
            padding: '2px 6px',
            background: '#f3f4f6',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
          }}>←</kbd> <kbd style={{
            padding: '2px 6px',
            background: '#f3f4f6',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
          }}>→</kbd> 切换步骤，按 <kbd style={{
            padding: '2px 6px',
            background: '#f3f4f6',
            borderRadius: '4px',
            fontSize: '10px',
            fontFamily: 'monospace',
          }}>Esc</kbd> 退出
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse-highlight {
          0%, 100% {
            opacity: 1;
            stroke-width: 3;
          }
          50% {
            opacity: 0.6;
            stroke-width: 5;
          }
        }
      `}</style>
    </div>
  );
};
