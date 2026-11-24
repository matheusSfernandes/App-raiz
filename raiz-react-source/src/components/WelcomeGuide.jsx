import { useEffect, useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { sb } from '../lib/supabaseClient';
import { CheckIcon } from './ui/Icons';

// Etapa 7, Primeiro acesso guiado (com B1 e B2 dos testes de 24/11):
// aparece no Início de uma conta nova até a pessoa concluir os passos ou tocar em "Pular guia".
// A escolha fica no perfil (onboarding_done), então não volta em outro aparelho.
export default function WelcomeGuide({ onNavigate }) {
  const { user, profile, habits, tasks, transactions, saveProfile } = useAppData();
  const [hasTask, setHasTask] = useState(tasks.length > 0);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // A lista de tarefas do app é só a de hoje; uma consulta leve confere se existe alguma em outro dia
  useEffect(() => {
    if (tasks.length) { setHasTask(true); return; }
    let off = false;
    sb.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      .then(({ count }) => { if (!off && count) setHasTask(true); });
    return () => { off = true; };
  }, [tasks.length, user.id]);

  if (profile.onboarding_done) return null;

  const steps = [
    { key: 'nome', done: !!profile.name, title: 'Como quer ser chamado?', text: 'Seu nome aparece na saudação do Início.' },
    { key: 'habitos', done: habits.length > 0, title: 'Crie seu primeiro hábito', text: 'Algo pequeno que você quer repetir, como beber água ou ler 10 páginas.', action: 'Criar hábito' },
    { key: 'rotina', done: hasTask, title: 'Planeje uma tarefa', text: 'O que você precisa fazer hoje ou nos próximos dias.', action: 'Criar tarefa' },
    { key: 'financas', done: transactions.length > 0, title: 'Registre uma entrada ou um gasto', text: 'Assim o Raiz começa a mostrar seu saldo e seus gastos por categoria.', action: 'Registrar' },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;
  const finish = () => saveProfile({ onboarding_done: true });

  async function saveName(e) {
    e.preventDefault();
    const v = name.trim();
    if (!v || savingName) return;
    setSavingName(true);
    await saveProfile({ name: v.slice(0, 60) });
    setSavingName(false);
  }

  return (
    <section className="welcome-card" aria-labelledby="welcome-title">
      <div className="welcome-head">
        <h2 id="welcome-title">{allDone ? 'Pronto, seu Raiz está montado' : 'Boas-vindas ao Raiz'}</h2>
        <span className="welcome-count">{doneCount} de {steps.length}</span>
      </div>
      <div className="mini-track" aria-hidden="true"><div className="mini-fill" style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      {allDone ? (
        <p className="welcome-sub">Agora é só voltar aqui todo dia: marque os hábitos, confira as tarefas e acompanhe o progresso. Metas, Treino e Foco estão no menu.</p>
      ) : (
        <p className="welcome-sub">Quatro passos rápidos para começar. Você pode fazer em qualquer ordem.</p>
      )}

      {!allDone && (
        <ol className="welcome-steps">
          {steps.map(s => (
            <li key={s.key} className={`welcome-step ${s.done ? 'done' : ''}`}>
              <span className="welcome-check" aria-hidden="true">{s.done ? <CheckIcon /> : null}</span>
              <div className="welcome-body">
                <div className="welcome-step-title">{s.title}{s.done && <span className="sr-only"> (feito)</span>}</div>
                {!s.done && <div className="welcome-step-text">{s.text}</div>}
                {!s.done && s.key === 'nome' && (
                  <form className="welcome-name" onSubmit={saveName}>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" maxLength={60} aria-label="Seu nome" autoComplete="given-name" />
                    <button className="btn" type="submit" disabled={!name.trim() || savingName}>{savingName ? 'Salvando…' : 'Salvar'}</button>
                  </form>
                )}
              </div>
              {!s.done && s.action && (
                <button className="btn welcome-go" onClick={() => onNavigate?.(s.key, 'novo')}>{s.action}</button>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="welcome-foot">
        {allDone
          ? <button className="btn" onClick={finish}>Fechar guia</button>
          : <button className="link-btn" onClick={finish}>Pular guia</button>}
      </div>
    </section>
  );
}
