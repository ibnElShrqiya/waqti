import { useMemo, useState, type FormEvent } from 'react';
import { Check, MessageSquarePlus, Send, ShieldAlert, Sparkles, Trash2, X } from 'lucide-react';
import { isSupabaseActive } from '@/data';
import type { AIProposedAction } from '@/domain/types';
import {
  useAIConversations,
  useAIMessages,
  useAssistantMutations,
} from '@/features/assistant/api/useAssistant';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/stores/preferences';
import { toast } from '@/stores/toast';
import { Badge, Button, Card, EmptyState, Input, Switch } from '@/components/ui';

export function AssistantPage() {
  const { t, fmt, locale } = useI18n();
  const spiritualEnabled = usePreferences((s) => s.spiritualEnabled);
  const conversationsQuery = useAIConversations();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const messagesQuery = useAIMessages(activeConvId);
  const mutations = useAssistantMutations();

  const [input, setInput] = useState('');
  const [personalization, setPersonalization] = useState(true);
  const [shareSpiritual, setShareSpiritual] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [handledActions, setHandledActions] = useState<Record<string, 'approved' | 'dismissed'>>({});

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data]);
  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  const sendPrompt = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setErrorMsg(null);
    try {
      const res = await mutations.sendMessage.mutateAsync({
        conversationId: activeConvId ?? undefined,
        message: clean,
        locale,
        personalizationEnabled: personalization,
        shareSpiritualContext: spiritualEnabled && shareSpiritual,
      });
      setActiveConvId(res.conversationId);
      setInput('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('dashboard.error.hint'));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendPrompt(input);
  };

  const handleApproveAction = async (action: AIProposedAction) => {
    try {
      await mutations.executeAction.mutateAsync(action);
      setHandledActions((s) => ({ ...s, [action.id]: 'approved' }));
      toast.success(t('assistantModule.actionApplied'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('quickAdd.error'));
    }
  };

  const suggested =
    locale === 'ar'
      ? [
          'لخّص جدولي وأولوياتي لليوم.',
          'ابحث عن أوقات فراغ في تقويمي واقترح خطة واقعية.',
          'ما المهام غير المكتملة التي ينبغي أن أبدأ بها؟',
        ]
      : [
          'Summarize my schedule and priorities for today.',
          'Find free time blocks in my calendar and suggest a realistic plan.',
          'Which unfinished tasks should I tackle first?',
        ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('assistantModule.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('assistantModule.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          leadingIcon={<MessageSquarePlus />}
          onClick={() => {
            setActiveConvId(null);
            setErrorMsg(null);
          }}
        >
          {t('assistantModule.newChat')}
        </Button>
      </div>

      {!isSupabaseActive ? (
        <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 p-4 text-xs text-ink">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
          <div>
            <p className="font-semibold text-accent-strong">{t('assistantModule.backendNoticeTitle')}</p>
            <p className="mt-1 leading-relaxed text-ink-muted">{t('assistantModule.backendNoticeBody')}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Conversations & Privacy Controls */}
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle rtl:tracking-normal">
              {t('assistantModule.conversations')}
            </p>
            {conversations.length === 0 ? (
              <p className="mt-3 text-xs text-ink-subtle">{t('assistantModule.emptyChats')}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-1.5">
                {conversations.map((conv) => (
                  <li key={conv.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveConvId(conv.id)}
                      className={cn(
                        'min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-start text-xs font-medium transition-colors',
                        activeConvId === conv.id
                          ? 'bg-primary-soft text-primary dark:text-primary-strong'
                          : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                      )}
                    >
                      {conv.title}
                    </button>
                    <button
                      type="button"
                      aria-label={t('assistantModule.deleteChat')}
                      onClick={() => {
                        void mutations.deleteConversation.mutateAsync(conv.id).then(() => {
                          if (activeConvId === conv.id) setActiveConvId(null);
                        });
                      }}
                      className="rounded-lg p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex flex-col gap-3 p-4">
            <label className="flex items-center justify-between gap-3 text-xs text-ink-muted">
              <span>{t('assistantModule.personalizationLabel')}</span>
              <Switch
                checked={personalization}
                onChange={setPersonalization}
                label={t('assistantModule.personalizationLabel')}
              />
            </label>
            {spiritualEnabled ? (
              <label className="flex items-center justify-between gap-3 text-xs text-ink-muted">
                <span>{t('assistantModule.shareSpiritualLabel')}</span>
                <Switch
                  checked={shareSpiritual}
                  onChange={setShareSpiritual}
                  label={t('assistantModule.shareSpiritualLabel')}
                />
              </label>
            ) : null}
          </Card>
        </aside>

        {/* Chat Panel */}
        <Card className="flex min-h-[480px] flex-col lg:col-span-8">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <EmptyState
                  icon={<Sparkles />}
                  title={t('assistantModule.emptyChats')}
                  description={t('assistantModule.subtitle')}
                  compact
                />
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {suggested.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendPrompt(prompt)}
                      className="rounded-full border border-line bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col gap-2',
                    msg.role === 'user' ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-fg'
                        : 'border border-line bg-surface-2 text-ink',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="mt-1.5 text-[10px] opacity-70 tabular">
                      {fmt.time(new Date(msg.createdAt))}
                    </p>
                  </div>

                  {msg.proposedActions && msg.proposedActions.length > 0 ? (
                    <div className="w-full max-w-[85%] space-y-2 rounded-2xl border border-accent/40 bg-accent-soft/40 p-3.5">
                      <p className="text-xs font-semibold text-accent-strong">
                        {t('assistantModule.proposedActionsTitle')}
                      </p>
                      {msg.proposedActions.map((act) => {
                        const state = handledActions[act.id] ?? act.status;
                        return (
                          <div
                            key={act.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs"
                          >
                            <div className="min-w-0 flex-1">
                              <Badge tone="accent" className="mb-1">
                                {act.type}
                              </Badge>
                              <p className="font-medium text-ink">{act.summary}</p>
                            </div>
                            {state === 'approved' ? (
                              <Badge tone="success">{t('assistantModule.actionApplied')}</Badge>
                            ) : state === 'dismissed' ? (
                              <Badge tone="neutral">{t('assistantModule.actionDismissed')}</Badge>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  leadingIcon={<Check />}
                                  onClick={() => void handleApproveAction(act)}
                                  disabled={mutations.executeAction.isPending}
                                >
                                  {t('assistantModule.approveAction')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  leadingIcon={<X />}
                                  onClick={() =>
                                    setHandledActions((s) => ({ ...s, [act.id]: 'dismissed' }))
                                  }
                                >
                                  {t('assistantModule.dismissAction')}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))
            )}

            {errorMsg ? (
              <div role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-xs text-danger">
                {errorMsg}
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line p-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('assistantModule.inputPlaceholder')}
              aria-label={t('assistantModule.inputPlaceholder')}
              disabled={mutations.sendMessage.isPending}
            />
            <Button
              type="submit"
              loading={mutations.sendMessage.isPending}
              disabled={!input.trim()}
              leadingIcon={<Send className="rtl:-scale-x-100" />}
            >
              {mutations.sendMessage.isPending ? t('assistantModule.sending') : t('assistantModule.send')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
