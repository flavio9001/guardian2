import { useState, useEffect, useRef } from "react";

// ============================================================
// DADOS MOCK
// ============================================================
const INITIAL_USERS = [
  { id:1, nome:"Cel. Ricardo Monteiro", telefone:"21 99304-4073", endereco:"Rua das Acácias, 120 - Tijuca", funcao:"Gestor", sala:"Geral", turno:"8x4", isGestor:true, senha:"1234", avatar:"RM", ativo:true },
  { id:2, nome:"Ag. Carlos Ferreira", telefone:"21 98800-1111", endereco:"Av. Brasil, 400 - Madureira", funcao:"Motorista", sala:"Alpha", turno:"12x36", isGestor:false, senha:"1234", avatar:"CF", ativo:true },
  { id:3, nome:"Ag. Mariana Silva", telefone:"21 98800-2222", endereco:"Rua das Flores, 55 - Botafogo", funcao:"Segurança", sala:"Alpha", turno:"12x36", isGestor:false, senha:"1234", avatar:"MS", ativo:true },
  { id:4, nome:"Ag. Paulo Rocha", telefone:"21 98800-3333", endereco:"Rua Visconde, 88 - Santa Cruz", funcao:"AJO", sala:"Bravo", turno:"24x72", isGestor:false, senha:"1234", avatar:"PR", ativo:true },
  { id:5, nome:"Ag. Ana Costa", telefone:"21 98800-4444", endereco:"Av. Engenheiro Paulo, 200 - Jacarepaguá", funcao:"Guarda Municipal", sala:"Alpha", turno:"12x36", isGestor:false, senha:"1234", avatar:"AC", ativo:true },
  { id:6, nome:"Ag. Rafael Souza", telefone:"21 98800-5555", endereco:"Rua Almirante, 30 - Niterói", funcao:"Assistente", sala:"Bravo", turno:"6x2", isGestor:false, senha:"1234", avatar:"RS", ativo:true },
  { id:7, nome:"Ag. Beatriz Lima", telefone:"21 98800-6666", endereco:"Av. das Américas, 700 - Barra", funcao:"Segurança", sala:"Bravo", turno:"12x36", isGestor:false, senha:"1234", avatar:"BL", ativo:true },
  { id:8, nome:"Ag. Fernando Neves", telefone:"21 98800-7777", endereco:"Rua Major, 15 - Campo Grande", funcao:"Motorista", sala:"Charlie", turno:"24x72", isGestor:false, senha:"1234", avatar:"FN", ativo:true },
  { id:9, nome:"Ag. Juliana Torres", telefone:"21 98800-8888", endereco:"Rua Conde, 33 - São Cristóvão", funcao:"Guarda Municipal", sala:"Charlie", turno:"12x36", isGestor:false, senha:"1234", avatar:"JT", ativo:true },
];

const INITIAL_VIPS = [
  { id:1, nome:"Dr. Alexandre Mendes", cargo:"Secretário Municipal", foto:"AM", nivel:"Máximo", ativo:true },
  { id:2, nome:"Dra. Patrícia Alves", cargo:"Prefeita", foto:"PA", nivel:"Máximo", ativo:true },
  { id:3, nome:"Sr. Roberto Campos", cargo:"Vereador-Chefe", foto:"RC", nivel:"Alto", ativo:false },
];

const INITIAL_CARS = [
  { id:1, marca:"Toyota", modelo:"Hilux", placa:"RIO-1A23", cor:"Preto", status:"Disponível" },
  { id:2, marca:"Chevrolet", modelo:"S10", placa:"RIO-2B45", cor:"Prata", status:"Em uso" },
  { id:3, marca:"Ford", modelo:"Ranger", placa:"RIO-3C67", cor:"Branco", status:"Disponível" },
  { id:4, marca:"Volkswagen", modelo:"Amarok", placa:"RIO-4D89", cor:"Cinza", status:"Manutenção" },
];

const hoje = new Date();
const fmtDate = (d) => d.toISOString().split('T')[0];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

const INITIAL_EVENTS = [
  { id:1, titulo:"Visita ao Palácio da Cidade", tipo:"Evento", data: fmtDate(hoje), hora:"09:00", local:"Palácio da Cidade - Centro", vipId:1, colaboradores:[1,2,4], carro:1, status:"Ativo", descricao:"Reunião com gabinete" },
  { id:2, titulo:"Escolta Aeroporto", tipo:"Escolta", data: fmtDate(hoje), hora:"14:30", local:"Aeroporto Internacional Tom Jobim", vipId:2, colaboradores:[1,3,5,8], carro:2, status:"Ativo", descricao:"Chegada de delegação" },
  { id:3, titulo:"Evento Cultural - CCBB", tipo:"Evento", data: fmtDate(addDays(hoje,1)), hora:"19:00", local:"Centro Cultural Banco do Brasil", vipId:2, colaboradores:[2,4,7], carro:3, status:"Planejado", descricao:"Abertura de exposição" },
  { id:4, titulo:"Reunião na Câmara", tipo:"Reunião", data: fmtDate(addDays(hoje,2)), hora:"10:00", local:"Câmara Municipal do Rio de Janeiro", vipId:1, colaboradores:[3,6,9], carro:1, status:"Planejado", descricao:"Sessão ordinária" },
  { id:5, titulo:"Patrulha Rotineira", tipo:"Patrulha", data: fmtDate(addDays(hoje,-1)), hora:"08:00", local:"Zona Sul - RJ", vipId:null, colaboradores:[2,5,8], carro:4, status:"Concluído", descricao:"" },
];

const INITIAL_MESSAGES = {
  "Geral": [
    { id:1, userId:1, texto:"Bom dia equipe! Hoje temos dois eventos confirmados.", hora:"07:15", data: fmtDate(hoje) },
    { id:2, userId:2, texto:"Bom dia Coronel! Já estou de prontidão.", hora:"07:22", data: fmtDate(hoje) },
    { id:3, userId:3, texto:"Confirmo presença nos eventos de hoje.", hora:"07:30", data: fmtDate(hoje) },
    { id:4, userId:4, texto:"Pronto para o serviço.", hora:"07:45", data: fmtDate(hoje) },
  ],
  "Alpha": [
    { id:1, userId:2, texto:"Viatura 1A23 revisada e pronta.", hora:"06:50", data: fmtDate(hoje) },
    { id:2, userId:3, texto:"Coletes verificados. Estamos prontos.", hora:"07:05", data: fmtDate(hoje) },
    { id:3, userId:5, texto:"Chegando ao ponto de encontro em 10 min.", hora:"07:40", data: fmtDate(hoje) },
  ],
  "Bravo": [
    { id:1, userId:4, texto:"Grupo Bravo, aguardem ordens.", hora:"07:00", data: fmtDate(hoje) },
    { id:2, userId:6, texto:"Entendido, aguardando.", hora:"07:10", data: fmtDate(hoje) },
    { id:3, userId:7, texto:"Ok, de prontidão.", hora:"07:20", data: fmtDate(hoje) },
  ],
  "Charlie": [
    { id:1, userId:8, texto:"Grupo Charlie online.", hora:"07:00", data: fmtDate(hoje) },
    { id:2, userId:9, texto:"Presente!", hora:"07:12", data: fmtDate(hoje) },
  ],
};

const TURNOS = [
  { codigo:"12x36", label:"12h trabalho × 36h descanso" },
  { codigo:"24x72", label:"24h trabalho × 72h descanso" },
  { codigo:"6x2", label:"6h trabalho × 2h descanso" },
  { codigo:"8x4", label:"8h trabalho × 4h descanso" },
  { codigo:"44h", label:"44h semanais (comercial)" },
];

const FUNCOES = ["Motorista","Segurança","Assistente","AJO","Guarda Municipal","Gestor"];
const SALAS = ["Geral","Alpha","Bravo","Charlie"];

// ============================================================
// ESTILOS
// ============================================================
const T = {
  bg:"#070D1A", surface:"#0D1B33", card:"#111E38", cardHover:"#162544",
  accent:"#C8973A", accentLight:"#E6B050", accentDim:"rgba(200,151,58,0.15)",
  text:"#EDF1FF", textMuted:"#7A93C0", textFaint:"#3D5580",
  border:"rgba(200,151,58,0.18)", borderFaint:"rgba(120,160,220,0.1)",
  success:"#27AE60", danger:"#E74C3C", info:"#2980B9", warning:"#F39C12",
  overlay:"rgba(7,13,26,0.92)",
};

const font = "'Barlow', sans-serif";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700;900&family=Barlow+Condensed:wght@600;700;900&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  body { background:${T.bg}; font-family:${font}; color:${T.text}; }
  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:${T.accentDim}; border-radius:4px; }
  input, select, textarea { font-family:${font}; color:${T.text}; background:${T.surface}; border:1px solid ${T.border}; border-radius:8px; padding:10px 14px; width:100%; font-size:14px; outline:none; }
  input::placeholder, textarea::placeholder { color:${T.textFaint}; }
  input:focus, select:focus, textarea:focus { border-color:${T.accent}; }
  select option { background:${T.surface}; }
  button { cursor:pointer; font-family:${font}; }
`;

// ============================================================
// UTILITÁRIOS
// ============================================================
const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function calcularEscala(userId, users, events, historico) {
  const user = users.find(u => u.id === userId);
  if (!user) return [];
  const turno = TURNOS.find(t => t.codigo === user.turno) || TURNOS[0];
  return turno;
}

function isOnDuty(userId, date, users) {
  const user = users.find(u => u.id === userId);
  if (!user) return false;
  const d = new Date(date);
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(),0,0))/(1000*60*60*24));
  const turnoMap = {"12x36":2,"24x72":4,"6x2":3,"8x4":2,"44h":1};
  const cycle = turnoMap[user.turno] || 2;
  return (dayOfYear % cycle) === 0;
}

function Badge({ label, color }) {
  const colorMap = {
    verde:{ bg:"rgba(39,174,96,0.15)", text:"#27AE60", border:"rgba(39,174,96,0.3)" },
    vermelho:{ bg:"rgba(231,76,60,0.15)", text:"#E74C3C", border:"rgba(231,76,60,0.3)" },
    amarelo:{ bg:"rgba(200,151,58,0.15)", text:"#C8973A", border:"rgba(200,151,58,0.3)" },
    azul:{ bg:"rgba(41,128,185,0.15)", text:"#2980B9", border:"rgba(41,128,185,0.3)" },
    cinza:{ bg:"rgba(120,160,220,0.1)", text:"#7A93C0", border:"rgba(120,160,220,0.2)" },
  };
  const c = colorMap[color] || colorMap.cinza;
  return (
    <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20, background:c.bg, color:c.text, border:`1px solid ${c.border}`, letterSpacing:"0.5px", whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function Avatar({ initials, size=36, color=T.accent }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`rgba(200,151,58,0.15)`, border:`2px solid rgba(200,151,58,0.4)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:size*0.33, fontWeight:700, color:T.accent, letterSpacing:1 }}>
      {initials}
    </div>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
      <span style={{ fontSize:11, fontWeight:700, color:T.accent, letterSpacing:"2px", textTransform:"uppercase" }}>{children}</span>
      {action}
    </div>
  );
}

function Divider() {
  return <div style={{ height:1, background:T.borderFaint, margin:"16px 0" }} />;
}

function IconBtn({ onClick, children, active }) {
  return (
    <button onClick={onClick} style={{ background:active?T.accentDim:"transparent", border:`1px solid ${active?T.border:"transparent"}`, borderRadius:8, padding:"6px 10px", color:active?T.accent:T.textMuted, display:"flex", alignItems:"center", gap:4, fontSize:13 }}>
      {children}
    </button>
  );
}

// ============================================================
// TELA DE LOGIN
// ============================================================
function LoginScreen({ onLogin }) {
  const [sel, setSel] = useState(null);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  function tentar(user) {
    if (user.senha === senha || senha === "1234") {
      onLogin(user);
    } else {
      setErro("Senha incorreta");
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:390 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:48 }}>
          <div style={{ width:72, height:72, borderRadius:20, background:`linear-gradient(135deg, ${T.accent} 0%, ${T.accentLight} 100%)`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:`0 8px 32px rgba(200,151,58,0.3)` }}>
            <span style={{ fontSize:32 }}>🛡️</span>
          </div>
          <div style={{ fontFamily:"'Barlow Condensed', sans-serif", fontSize:32, fontWeight:900, color:T.text, letterSpacing:3, lineHeight:1 }}>GUARDIAN</div>
          <div style={{ fontSize:12, fontWeight:600, color:T.accent, letterSpacing:6, marginTop:4 }}>OPS SYSTEM</div>
          <div style={{ fontSize:13, color:T.textMuted, marginTop:8 }}>Gestão Operacional de Segurança</div>
        </div>

        {!sel ? (
          <>
            <div style={{ fontSize:13, color:T.textMuted, textAlign:"center", marginBottom:16, letterSpacing:1 }}>SELECIONE SEU PERFIL</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:320, overflowY:"auto" }}>
              {INITIAL_USERS.filter(u=>u.ativo).map(u => (
                <button key={u.id} onClick={()=>{ setSel(u); setErro(""); }}
                  style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, textAlign:"left", transition:"all 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.cardHover}
                  onMouseLeave={e=>e.currentTarget.style.background=T.card}
                >
                  <Avatar initials={u.avatar} size={40} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{u.nome}</div>
                    <div style={{ fontSize:12, color:T.textMuted }}>{u.funcao} · {u.sala}</div>
                  </div>
                  {u.isGestor && <Badge label="GESTOR" color="amarelo" />}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:20, marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                <Avatar initials={sel.avatar} size={44} />
                <div>
                  <div style={{ fontWeight:700 }}>{sel.nome}</div>
                  <div style={{ fontSize:13, color:T.textMuted }}>{sel.funcao}</div>
                </div>
              </div>
              <input type="password" placeholder="Senha (padrão: 1234)" value={senha}
                onChange={e=>{ setSenha(e.target.value); setErro(""); }}
                onKeyDown={e=>e.key==="Enter"&&tentar(sel)}
                style={{ marginBottom:erro?8:0 }}
              />
              {erro && <div style={{ fontSize:12, color:T.danger, marginTop:6 }}>{erro}</div>}
            </div>
            <button onClick={()=>tentar(sel)} style={{ width:"100%", padding:"14px", background:`linear-gradient(135deg, ${T.accent}, ${T.accentLight})`, border:"none", borderRadius:12, color:"#0D0800", fontWeight:700, fontSize:15, letterSpacing:1 }}>
              ENTRAR
            </button>
            <button onClick={()=>{ setSel(null); setSenha(""); setErro(""); }} style={{ width:"100%", marginTop:10, padding:"10px", background:"transparent", border:`1px solid ${T.border}`, borderRadius:12, color:T.textMuted, fontSize:14 }}>
              Voltar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HOME SCREEN (DASHBOARD)
// ============================================================
function HomeScreen({ user, events, users, vips, onNotif }) {
  const agora = new Date();
  const hojeStr = fmtDate(agora);
  const eventosHoje = events.filter(e => e.data === hojeStr && e.status !== "Concluído");
  const eventosAtivos = eventosHoje.filter(e => e.colaboradores.includes(user.id) || user.isGestor);
  const proximoEvento = eventosAtivos.sort((a,b) => a.hora.localeCompare(b.hora))[0];
  const vipsAtivos = vips.filter(v => v.ativo);

  const getVip = (id) => vips.find(v => v.id === id);
  const getUser = (id) => users.find(u => u.id === id);
  const getAJO = (ev) => {
    if (!ev) return null;
    const ajo = ev.colaboradores.map(id => users.find(u => u.id === id)).find(u => u?.funcao === "AJO");
    return ajo;
  };

  const statusColor = { "Ativo":T.success, "Planejado":T.info, "Concluído":T.textMuted };

  return (
    <div style={{ padding:"20px 16px", paddingBottom:80 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:T.text }}>Bom dia, {user.nome.split(" ")[1]}</div>
          <div style={{ fontSize:13, color:T.textMuted }}>{agora.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
        <Avatar initials={user.avatar} size={42} />
      </div>

      {/* Card Operação Atual */}
      {proximoEvento && (
        <div style={{ background:`linear-gradient(135deg, rgba(200,151,58,0.2) 0%, rgba(13,27,51,0.9) 100%)`, border:`1px solid ${T.border}`, borderRadius:16, padding:18, marginBottom:20, position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, right:0, width:80, height:80, background:`radial-gradient(circle, rgba(200,151,58,0.15) 0%, transparent 70%)`, pointerEvents:"none" }} />
          <div style={{ fontSize:10, fontWeight:700, color:T.accent, letterSpacing:3, marginBottom:8 }}>OPERAÇÃO EM ANDAMENTO</div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>{proximoEvento.titulo}</div>
          <div style={{ fontSize:13, color:T.textMuted, marginBottom:12 }}>🕐 {proximoEvento.hora} · 📍 {proximoEvento.local}</div>
          <Divider />
          <div style={{ display:"flex", gap:20 }}>
            {getVip(proximoEvento.vipId) && (
              <div>
                <div style={{ fontSize:11, color:T.textFaint, fontWeight:600, letterSpacing:1 }}>VIP</div>
                <div style={{ fontSize:14, fontWeight:700, color:T.accentLight }}>{getVip(proximoEvento.vipId)?.nome.split(" ").slice(-1)[0]}</div>
              </div>
            )}
            {getAJO(proximoEvento) && (
              <div>
                <div style={{ fontSize:11, color:T.textFaint, fontWeight:600, letterSpacing:1 }}>AJO</div>
                <div style={{ fontSize:14, fontWeight:700 }}>{getAJO(proximoEvento)?.nome.replace("Ag. ","")}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize:11, color:T.textFaint, fontWeight:600, letterSpacing:1 }}>EQUIPE</div>
              <div style={{ fontSize:14, fontWeight:700 }}>{proximoEvento.colaboradores.length} agentes</div>
            </div>
          </div>
        </div>
      )}

      {/* VIPs ativos */}
      <SectionTitle>VIPs Ativos</SectionTitle>
      <div style={{ display:"flex", gap:10, marginBottom:20, overflowX:"auto", paddingBottom:4 }}>
        {vipsAtivos.map(v => (
          <div key={v.id} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"12px 14px", flexShrink:0, minWidth:130, textAlign:"center" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(200,151,58,0.2)", border:`2px solid ${T.accent}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px", fontSize:16, fontWeight:700, color:T.accent }}>
              {v.foto}
            </div>
            <div style={{ fontSize:13, fontWeight:600, lineHeight:1.3, marginBottom:2 }}>{v.nome.split(" ").slice(-2).join(" ")}</div>
            <div style={{ fontSize:11, color:T.textMuted }}>{v.cargo.split(" ")[0]}</div>
            <div style={{ marginTop:6 }}><Badge label={v.nivel} color={v.nivel==="Máximo"?"vermelho":"amarelo"} /></div>
          </div>
        ))}
      </div>

      {/* Eventos de hoje */}
      <SectionTitle>Eventos Hoje</SectionTitle>
      {eventosHoje.length === 0 && (
        <div style={{ textAlign:"center", color:T.textMuted, fontSize:14, padding:24 }}>Nenhum evento agendado para hoje</div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {eventosHoje.map(ev => {
          const vip = getVip(ev.vipId);
          return (
            <div key={ev.id} style={{ background:T.card, border:`1px solid ${T.borderFaint}`, borderRadius:14, padding:"14px 16px", borderLeft:`3px solid ${statusColor[ev.status]||T.textFaint}` }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:6 }}>
                <div style={{ fontSize:15, fontWeight:600, flex:1 }}>{ev.titulo}</div>
                <Badge label={ev.status} color={ev.status==="Ativo"?"verde":ev.status==="Planejado"?"azul":"cinza"} />
              </div>
              <div style={{ fontSize:13, color:T.textMuted }}>🕐 {ev.hora} · 📍 {ev.local.split(" - ")[0]}</div>
              {vip && <div style={{ fontSize:13, color:T.accent, marginTop:4 }}>👤 VIP: {vip.nome}</div>}
              <div style={{ display:"flex", marginTop:8, gap:6 }}>
                {ev.colaboradores.slice(0,4).map(id => {
                  const u = getUser(id);
                  return u ? <div key={id} style={{ width:28, height:28, borderRadius:"50%", background:"rgba(200,151,58,0.15)", border:`1px solid rgba(200,151,58,0.3)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:T.accent }}>{u.avatar}</div> : null;
                })}
                {ev.colaboradores.length > 4 && <div style={{ width:28, height:28, borderRadius:"50%", background:T.surface, border:`1px solid ${T.borderFaint}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:T.textMuted }}>+{ev.colaboradores.length-4}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats rápidas */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:20 }}>
        {[
          { label:"Agentes Ativos", value:users.filter(u=>u.ativo).length, icon:"👥" },
          { label:"Eventos Hoje", value:eventosHoje.length, icon:"📋" },
          { label:"Viaturas Disp.", value:INITIAL_CARS.filter(c=>c.status==="Disponível").length, icon:"🚗" },
          { label:"VIPs Protegidos", value:vipsAtivos.length, icon:"🛡️" },
        ].map(s => (
          <div key={s.label} style={{ background:T.card, border:`1px solid ${T.borderFaint}`, borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:24, fontWeight:700, color:T.accent }}>{s.value}</div>
            <div style={{ fontSize:12, color:T.textMuted }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// AGENDA SCREEN
// ============================================================
function AgendaScreen({ user, events, setEvents, users, vips, cars }) {
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [diaSel, setDiaSel] = useState(hoje.getDate());
  const [showForm, setShowForm] = useState(false);
  const [evSel, setEvSel] = useState(null);
  const [form, setForm] = useState({ titulo:"", tipo:"Evento", hora:"09:00", local:"", vipId:"", descricao:"", colaboradores:[], carro:"" });

  const diasNoMes = new Date(ano, mes+1, 0).getDate();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const hojeStr = fmtDate(hoje);
  const dataSel = `${ano}-${String(mes+1).padStart(2,'0')}-${String(diaSel).padStart(2,'0')}`;

  const eventsDoDia = events.filter(e => e.data === dataSel && (user.isGestor || e.colaboradores.includes(user.id)));

  function temEvento(d) {
    const ds = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    return events.some(e => e.data === ds && (user.isGestor || e.colaboradores.includes(user.id)));
  }

  function salvarEvento() {
    if (!form.titulo || !form.hora || !form.local) return;
    const newEv = { ...form, id: Date.now(), data: dataSel, vipId: form.vipId ? Number(form.vipId) : null, colaboradores: form.colaboradores.map(Number), carro: form.carro ? Number(form.carro) : null, status:"Planejado" };
    setEvents(prev => [...prev, newEv]);
    setShowForm(false);
    setForm({ titulo:"", tipo:"Evento", hora:"09:00", local:"", vipId:"", descricao:"", colaboradores:[], carro:"" });
  }

  function excluirEvento(id) {
    setEvents(prev => prev.filter(e => e.id !== id));
    setEvSel(null);
  }

  const statusColor = { "Ativo":"#27AE60", "Planejado":"#2980B9", "Concluído":"#7A93C0" };
  const getVip = id => vips.find(v => v.id === id);
  const getUser = id => users.find(u => u.id === id);

  if (evSel) {
    const ev = events.find(e => e.id === evSel);
    if (!ev) { setEvSel(null); return null; }
    const vip = getVip(ev.vipId);
    const car = cars.find(c => c.id === ev.carro);
    return (
      <div style={{ padding:"16px", paddingBottom:80 }}>
        <button onClick={()=>setEvSel(null)} style={{ background:"transparent", border:"none", color:T.accent, fontSize:15, marginBottom:20, display:"flex", alignItems:"center", gap:6 }}>← Voltar</button>
        <div style={{ background:T.card, borderRadius:16, padding:20, marginBottom:16, borderLeft:`4px solid ${statusColor[ev.status]||T.textFaint}` }}>
          <Badge label={ev.tipo} color="azul" />
          <div style={{ fontSize:20, fontWeight:700, margin:"10px 0 4px" }}>{ev.titulo}</div>
          <div style={{ fontSize:13, color:T.textMuted }}>📅 {new Date(ev.data+'T00:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})} · {ev.hora}</div>
          {ev.local && <div style={{ fontSize:13, color:T.textMuted, marginTop:4 }}>📍 {ev.local}</div>}
          {ev.descricao && <div style={{ marginTop:10, fontSize:14, color:T.text }}>{ev.descricao}</div>}
          <Badge label={ev.status} color={ev.status==="Ativo"?"verde":ev.status==="Planejado"?"azul":"cinza"} />
        </div>
        {vip && (
          <div style={{ background:T.card, borderRadius:14, padding:16, marginBottom:12, border:`1px solid rgba(200,151,58,0.2)` }}>
            <div style={{ fontSize:11, color:T.textFaint, fontWeight:700, letterSpacing:2, marginBottom:8 }}>VIP PROTEGIDO</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Avatar initials={vip.foto} size={40} />
              <div>
                <div style={{ fontWeight:600 }}>{vip.nome}</div>
                <div style={{ fontSize:13, color:T.textMuted }}>{vip.cargo}</div>
              </div>
              <div style={{ marginLeft:"auto" }}><Badge label={vip.nivel} color={vip.nivel==="Máximo"?"vermelho":"amarelo"} /></div>
            </div>
          </div>
        )}
        <div style={{ background:T.card, borderRadius:14, padding:16, marginBottom:12, border:`1px solid ${T.borderFaint}` }}>
          <div style={{ fontSize:11, color:T.textFaint, fontWeight:700, letterSpacing:2, marginBottom:10 }}>EQUIPE ({ev.colaboradores.length})</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {ev.colaboradores.map(id => {
              const u = getUser(id);
              return u ? (
                <div key={id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar initials={u.avatar} size={32} />
                  <div>
                    <div style={{ fontSize:14, fontWeight:500 }}>{u.nome}</div>
                    <div style={{ fontSize:12, color:T.textMuted }}>{u.funcao}</div>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        </div>
        {car && (
          <div style={{ background:T.card, borderRadius:14, padding:16, marginBottom:12, border:`1px solid ${T.borderFaint}` }}>
            <div style={{ fontSize:11, color:T.textFaint, fontWeight:700, letterSpacing:2, marginBottom:6 }}>VIATURA</div>
            <div style={{ fontSize:15 }}>🚗 {car.marca} {car.modelo} · <span style={{ fontFamily:"monospace" }}>{car.placa}</span></div>
            <div style={{ fontSize:13, color:T.textMuted, marginTop:2 }}>Cor: {car.cor} · Status: {car.status}</div>
          </div>
        )}
        {user.isGestor && (
          <button onClick={()=>excluirEvento(ev.id)} style={{ width:"100%", padding:14, background:"rgba(231,76,60,0.1)", border:`1px solid rgba(231,76,60,0.3)`, borderRadius:12, color:T.danger, fontWeight:600, fontSize:14 }}>
            Excluir Evento
          </button>
        )}
      </div>
    );
  }

  if (showForm && user.isGestor) {
    return (
      <div style={{ padding:"16px", paddingBottom:80 }}>
        <button onClick={()=>setShowForm(false)} style={{ background:"transparent", border:"none", color:T.accent, fontSize:15, marginBottom:20 }}>← Voltar</button>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Novo Evento — {diaSel}/{mes+1}/{ano}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>TÍTULO *</label>
            <input value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} placeholder="Nome do evento ou tarefa" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>TIPO</label>
              <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
                {["Evento","Escolta","Reunião","Patrulha","Tarefa"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>HORÁRIO *</label>
              <input type="time" value={form.hora} onChange={e=>setForm({...form,hora:e.target.value})} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>LOCAL *</label>
            <input value={form.local} onChange={e=>setForm({...form,local:e.target.value})} placeholder="Endereço ou local do evento" />
          </div>
          <div>
            <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>VIP (opcional)</label>
            <select value={form.vipId} onChange={e=>setForm({...form,vipId:e.target.value})}>
              <option value="">— Nenhum —</option>
              {vips.filter(v=>v.ativo).map(v=><option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>COLABORADORES</label>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:10, display:"flex", flexDirection:"column", gap:8 }}>
              {users.filter(u=>u.ativo&&!u.isGestor).map(u=>(
                <label key={u.id} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                  <input type="checkbox" checked={form.colaboradores.includes(u.id)} onChange={e=>{
                    setForm(prev=>({ ...prev, colaboradores: e.target.checked ? [...prev.colaboradores,u.id] : prev.colaboradores.filter(x=>x!==u.id) }));
                  }} style={{ width:"auto", accentColor:T.accent }} />
                  <Avatar initials={u.avatar} size={26} />
                  <span style={{ fontSize:13 }}>{u.nome} <span style={{ color:T.textMuted }}>· {u.funcao}</span></span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>VIATURA</label>
            <select value={form.carro} onChange={e=>setForm({...form,carro:e.target.value})}>
              <option value="">— Nenhuma —</option>
              {cars.map(c=><option key={c.id} value={c.id}>{c.marca} {c.modelo} · {c.placa} ({c.status})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, color:T.textMuted, display:"block", marginBottom:4 }}>DESCRIÇÃO</label>
            <textarea value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} rows={3} placeholder="Detalhes adicionais..." style={{ resize:"none" }} />
          </div>
          <button onClick={salvarEvento} style={{ padding:14, background:`linear-gradient(135deg, ${T.accent}, ${T.accentLight})`, border:"none", borderRadius:12, color:"#0D0800", fontWeight:700, fontSize:15 }}>
            Cadastrar Evento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:"16px 16px", paddingBottom:80 }}>
      {/* Cabeçalho mês */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <button onClick={()=>{ if(mes===0){ setMes(11); setAno(y=>y-1); } else setMes(m=>m-1); }} style={{ background:"transparent", border:"none", color:T.accent, fontSize:20, padding:"4px 10px" }}>‹</button>
        <div style={{ fontSize:16, fontWeight:700 }}>{meses[mes]} {ano}</div>
        <button onClick={()=>{ if(mes===11){ setMes(0); setAno(y=>y+1); } else setMes(m=>m+1); }} style={{ background:"transparent", border:"none", color:T.accent, fontSize:20, padding:"4px 10px" }}>›</button>
      </div>

      {/* Grid calendário */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:20 }}>
        {diasSemana.map(d=><div key={d} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:T.textFaint, padding:"4px 0" }}>{d}</div>)}
        {Array(primeiroDia).fill(null).map((_,i)=><div key={`e${i}`} />)}
        {Array(diasNoMes).fill(null).map((_,i)=>{
          const d = i+1;
          const ds = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const isHoje = ds === hojeStr;
          const isSel = d === diaSel;
          const hasEv = temEvento(d);
          return (
            <button key={d} onClick={()=>setDiaSel(d)} style={{ aspectRatio:"1", background: isSel ? T.accent : isHoje ? T.accentDim : "transparent", border: isHoje&&!isSel ? `1px solid ${T.accent}` : "1px solid transparent", borderRadius:8, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, cursor:"pointer" }}>
              <span style={{ fontSize:13, fontWeight:isSel||isHoje?700:400, color: isSel ? "#0D0800" : T.text }}>{d}</span>
              {hasEv && <div style={{ width:4, height:4, borderRadius:"50%", background: isSel ? "#0D0800" : T.accent }} />}
            </button>
          );
        })}
      </div>

      {/* Eventos do dia selecionado */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <SectionTitle>{diasSemana[new Date(dataSel+'T00:00:00').getDay()]}, {diaSel} de {meses[mes]}</SectionTitle>
        {user.isGestor && (
          <button onClick={()=>setShowForm(true)} style={{ background:T.accentDim, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px", color:T.accent, fontSize:13, fontWeight:600 }}>+ Evento</button>
        )}
      </div>
      {eventsDoDia.length === 0 && (
        <div style={{ textAlign:"center", color:T.textMuted, padding:32, fontSize:14 }}>Nenhum evento neste dia</div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {eventsDoDia.map(ev=>{
          const vip = getVip(ev.vipId);
          const statusC = { "Ativo":T.success, "Planejado":T.info, "Concluído":T.textMuted };
          return (
            <button key={ev.id} onClick={()=>setEvSel(ev.id)} style={{ background:T.card, border:`1px solid ${T.borderFaint}`, borderRadius:14, padding:"14px 16px", textAlign:"left", borderLeft:`3px solid ${statusC[ev.status]||T.textFaint}`, width:"100%" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                <div style={{ fontSize:15, fontWeight:600 }}>{ev.titulo}</div>
                <Badge label={ev.tipo} color="azul" />
              </div>
              <div style={{ fontSize:13, color:T.textMuted }}>🕐 {ev.hora} · 👥 {ev.colaboradores.length} agentes</div>
              {vip && <div style={{ fontSize:13, color:T.accent, marginTop:2 }}>👤 {vip.nome}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// ESCALA SCREEN
// ============================================================
function EscalaScreen({ user, users, events }) {
  const [semana, setSemana] = useState(0);
  const diasDaSemana = Array(7).fill(null).map((_,i) => addDays(hoje, semana*7 + i - hoje.getDay()));

  function getStatus(userId, date) {
    const ds = fmtDate(date);
    const ev = events.filter(e => e.data === ds && e.colaboradores.includes(userId));
    if (ev.length > 0) return { tipo:"evento", label:ev[0].titulo.substring(0,12)+"..." };
    if (isOnDuty(userId, date, users)) return { tipo:"plantao", label:"De Plantão" };
    return { tipo:"folga", label:"Folga" };
  }

  const corStatus = { plantao:"#27AE60", evento:"#2980B9", folga:"#3D5580" };
  const bgStatus = { plantao:"rgba(39,174,96,0.1)", evento:"rgba(41,128,185,0.1)", folga:"transparent" };
  const minhaEscala = !user.isGestor;
  const listaUsers = minhaEscala ? [user] : users.filter(u=>u.ativo&&!u.isGestor);

  return (
    <div style={{ paddingBottom:80 }}>
      {/* Header semana */}
      <div style={{ padding:"16px 16px 0", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <button onClick={()=>setSemana(s=>s-1)} style={{ background:"transparent", border:"none", color:T.accent, fontSize:18, padding:"4px 10px" }}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:14, fontWeight:600 }}>
            {diasDaSemana[0].toLocaleDateString('pt-BR',{day:'numeric',month:'short'})} – {diasDaSemana[6].toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'})}
          </div>
          {semana===0 && <div style={{ fontSize:11, color:T.accent, marginTop:2 }}>SEMANA ATUAL</div>}
        </div>
        <button onClick={()=>setSemana(s=>s+1)} style={{ background:"transparent", border:"none", color:T.accent, fontSize:18, padding:"4px 10px" }}>›</button>
      </div>

      {/* Dias da semana header */}
      <div style={{ display:"grid", gridTemplateColumns:`100px repeat(7,1fr)`, padding:"0 4px", marginBottom:8, gap:2 }}>
        <div />
        {diasDaSemana.map((d,i)=>{
          const isHj = fmtDate(d) === fmtDate(hoje);
          return (
            <div key={i} style={{ textAlign:"center", padding:"4px 2px", background:isHj?T.accentDim:"transparent", borderRadius:6 }}>
              <div style={{ fontSize:10, color:isHj?T.accent:T.textFaint, fontWeight:700 }}>{diasSemana[d.getDay()]}</div>
              <div style={{ fontSize:13, fontWeight:700, color:isHj?T.accent:T.text }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Linhas de colaboradores */}
      <div style={{ display:"flex", flexDirection:"column", gap:2, padding:"0 4px" }}>
        {listaUsers.map(u=>(
          <div key={u.id} style={{ display:"grid", gridTemplateColumns:`100px repeat(7,1fr)`, gap:2, alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 4px" }}>
              <Avatar initials={u.avatar} size={24} />
              <div style={{ overflow:"hidden" }}>
                <div style={{ fontSize:11, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.nome.split(" ").slice(-1)[0]}</div>
                <div style={{ fontSize:10, color:T.textFaint }}>{u.turno}</div>
              </div>
            </div>
            {diasDaSemana.map((d,i)=>{
              const st = getStatus(u.id, d);
              return (
                <div key={i} style={{ background:bgStatus[st.tipo], border:`1px solid ${corStatus[st.tipo]}22`, borderRadius:6, padding:"3px 2px", textAlign:"center", minHeight:36, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ fontSize:9, fontWeight:600, color:corStatus[st.tipo], lineHeight:1.3 }}>{st.label}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div style={{ display:"flex", gap:16, padding:"16px 16px", justifyContent:"center" }}>
        {[{cor:corStatus.plantao,label:"De Plantão"},{cor:corStatus.evento,label:"Em Evento"},{cor:corStatus.folga,label:"Folga"}].map(l=>(
          <div key={l.label} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:l.cor, opacity:0.7 }} />
            <span style={{ fontSize:11, color:T.textMuted }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Meu turno */}
      <div style={{ padding:"0 16px 16px" }}>
        <div style={{ background:T.card, borderRadius:14, padding:16, border:`1px solid ${T.border}` }}>
          <SectionTitle>Configuração de Turno</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(user.isGestor ? users.filter(u=>u.ativo&&!u.isGestor) : [user]).map(u=>{
              const turno = TURNOS.find(t=>t.codigo===u.turno);
              return (
                <div key={u.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar initials={u.avatar} size={32} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{u.nome.replace("Ag. ","")}</div>
                    <div style={{ fontSize:12, color:T.textMuted }}>{turno?.label || u.turno}</div>
                  </div>
                  <Badge label={u.turno} color="azul" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CHAT SCREEN
// ============================================================
function ChatScreen({ user, messages, setMessages }) {
  const [salaAtiva, setSalaAtiva] = useState("Geral");
  const [texto, setTexto] = useState("");
  const msgEndRef = useRef(null);
  const salasVisiveis = user.isGestor ? SALAS : ["Geral", user.sala];
  const msgs = messages[salaAtiva] || [];

  useEffect(()=>{ msgEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs.length, salaAtiva]);

  function enviar() {
    if (!texto.trim()) return;
    const nova = { id:Date.now(), userId:user.id, texto:texto.trim(), hora: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}), data: fmtDate(hoje) };
    setMessages(prev => ({ ...prev, [salaAtiva]: [...(prev[salaAtiva]||[]), nova] }));
    setTexto("");
  }

  const getUser = id => INITIAL_USERS.find(u=>u.id===id);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 60px)" }}>
      {/* Seletor de salas */}
      <div style={{ display:"flex", gap:6, padding:"12px 16px 8px", overflowX:"auto", flexShrink:0 }}>
        {salasVisiveis.map(sala=>(
          <button key={sala} onClick={()=>setSalaAtiva(sala)} style={{ background: salaAtiva===sala ? T.accent : T.card, border: salaAtiva===sala ? "none" : `1px solid ${T.borderFaint}`, borderRadius:20, padding:"6px 14px", color: salaAtiva===sala ? "#0D0800" : T.textMuted, fontSize:13, fontWeight: salaAtiva===sala ? 700 : 400, whiteSpace:"nowrap", flexShrink:0 }}>
            {sala === "Geral" ? "🌐 Geral" : `📡 ${sala}`}
          </button>
        ))}
      </div>

      <div style={{ borderBottom:`1px solid ${T.borderFaint}`, padding:"8px 16px", flexShrink:0 }}>
        <div style={{ fontSize:14, fontWeight:600 }}>Sala: {salaAtiva}</div>
        <div style={{ fontSize:12, color:T.textMuted }}>Histórico de 7 dias · {msgs.length} mensagens</div>
      </div>

      {/* Mensagens */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {msgs.length === 0 && <div style={{ textAlign:"center", color:T.textFaint, fontSize:14, marginTop:40 }}>Nenhuma mensagem ainda</div>}
        {msgs.map((m,i)=>{
          const eu = m.userId === user.id;
          const sender = getUser(m.userId);
          const showName = !eu && (i===0 || msgs[i-1].userId !== m.userId);
          return (
            <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems: eu ? "flex-end" : "flex-start" }}>
              {showName && sender && (
                <div style={{ fontSize:11, color:T.accent, marginBottom:2, marginLeft:8 }}>{sender.nome.replace("Ag. "," ").replace("Cel. ","")}</div>
              )}
              <div style={{ maxWidth:"80%", background: eu ? T.accent : T.card, borderRadius: eu ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding:"10px 14px", border: eu ? "none" : `1px solid ${T.borderFaint}` }}>
                <div style={{ fontSize:14, color: eu ? "#0D0800" : T.text, lineHeight:1.4 }}>{m.texto}</div>
                <div style={{ fontSize:10, color: eu ? "rgba(0,0,0,0.5)" : T.textFaint, marginTop:4, textAlign:"right" }}>{m.hora}</div>
              </div>
            </div>
          );
        })}
        <div ref={msgEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding:"10px 16px", borderTop:`1px solid ${T.borderFaint}`, display:"flex", gap:8, flexShrink:0, paddingBottom:72 }}>
        <input value={texto} onChange={e=>setTexto(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&enviar()} placeholder="Digite uma mensagem..." style={{ flex:1 }} />
        <button onClick={enviar} style={{ background:T.accent, border:"none", borderRadius:10, padding:"10px 16px", color:"#0D0800", fontWeight:700, fontSize:14 }}>
          ➤
        </button>
      </div>
    </div>
  );
}

// ============================================================
// ADMIN SCREEN
// ============================================================
function AdminScreen({ user, users, setUsers, vips, setVips, cars, setCars }) {
  const [tab, setTab] = useState("colaboradores");
  const [formCo, setFormCo] = useState(null);
  const [formVip, setFormVip] = useState(null);
  const [formCar, setFormCar] = useState(null);
  const [editId, setEditId] = useState(null);

  const emptyColab = { nome:"", telefone:"", endereco:"", funcao:"Segurança", sala:"Alpha", turno:"12x36", senha:"1234", avatar:"", ativo:true, isGestor:false };
  const emptyVip = { nome:"", cargo:"", foto:"", nivel:"Alto", ativo:true };
  const emptyCar = { marca:"", modelo:"", placa:"", cor:"", status:"Disponível" };

  function salvarColab() {
    if (!formCo.nome) return;
    const av = formCo.avatar || formCo.nome.split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase();
    if (editId) {
      setUsers(prev => prev.map(u => u.id===editId ? {...formCo,avatar:av,id:editId} : u));
    } else {
      setUsers(prev => [...prev, {...formCo, avatar:av, id:Date.now()}]);
    }
    setFormCo(null); setEditId(null);
  }

  function salvarVip() {
    if (!formVip.nome) return;
    const fotoAv = formVip.foto || formVip.nome.split(" ").slice(0,2).map(x=>x[0]).join("").toUpperCase();
    if (editId) {
      setVips(prev => prev.map(v => v.id===editId ? {...formVip,foto:fotoAv,id:editId} : v));
    } else {
      setVips(prev => [...prev, {...formVip, foto:fotoAv, id:Date.now()}]);
    }
    setFormVip(null); setEditId(null);
  }

  function salvarCar() {
    if (!formCar.modelo || !formCar.placa) return;
    if (editId) {
      setCars(prev => prev.map(c => c.id===editId ? {...formCar,id:editId} : c));
    } else {
      setCars(prev => [...prev, {...formCar, id:Date.now()}]);
    }
    setFormCar(null); setEditId(null);
  }

  const tabs = [
    { id:"colaboradores", label:"👥 Colaboradores" },
    { id:"vips", label:"🛡️ VIPs" },
    { id:"viaturas", label:"🚗 Viaturas" },
  ];

  if (formCo) {
    return (
      <div style={{ padding:"16px", paddingBottom:80 }}>
        <button onClick={()=>{setFormCo(null);setEditId(null);}} style={{ background:"transparent", border:"none", color:T.accent, fontSize:15, marginBottom:16 }}>← Voltar</button>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>{editId?"Editar":"Novo"} Colaborador</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[{k:"nome",l:"NOME COMPLETO *"},{k:"telefone",l:"TELEFONE"},{k:"endereco",l:"ENDEREÇO"}].map(f=>(
            <div key={f.k}>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>{f.l}</label>
              <input value={formCo[f.k]} onChange={e=>setFormCo({...formCo,[f.k]:e.target.value})} placeholder={f.l.replace(" *","")} />
            </div>
          ))}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>FUNÇÃO</label>
              <select value={formCo.funcao} onChange={e=>setFormCo({...formCo,funcao:e.target.value})}>
                {FUNCOES.map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>SALA / GRUPO</label>
              <select value={formCo.sala} onChange={e=>setFormCo({...formCo,sala:e.target.value})}>
                {SALAS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>TURNO</label>
              <select value={formCo.turno} onChange={e=>setFormCo({...formCo,turno:e.target.value})}>
                {TURNOS.map(t=><option key={t.codigo} value={t.codigo}>{t.codigo}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>SENHA</label>
              <input value={formCo.senha} onChange={e=>setFormCo({...formCo,senha:e.target.value})} type="password" placeholder="Senha" />
            </div>
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
            <input type="checkbox" checked={formCo.ativo} onChange={e=>setFormCo({...formCo,ativo:e.target.checked})} style={{ width:"auto", accentColor:T.accent }} />
            <span style={{ fontSize:14 }}>Colaborador Ativo</span>
          </label>
          <button onClick={salvarColab} style={{ padding:14, background:`linear-gradient(135deg, ${T.accent}, ${T.accentLight})`, border:"none", borderRadius:12, color:"#0D0800", fontWeight:700, fontSize:15, marginTop:8 }}>
            {editId?"Salvar Alterações":"Cadastrar"}
          </button>
        </div>
      </div>
    );
  }

  if (formVip) {
    return (
      <div style={{ padding:"16px", paddingBottom:80 }}>
        <button onClick={()=>{setFormVip(null);setEditId(null);}} style={{ background:"transparent", border:"none", color:T.accent, fontSize:15, marginBottom:16 }}>← Voltar</button>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>{editId?"Editar":"Novo"} VIP</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>NOME COMPLETO *</label>
            <input value={formVip.nome} onChange={e=>setFormVip({...formVip,nome:e.target.value})} placeholder="Nome completo" />
          </div>
          <div>
            <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>CARGO / FUNÇÃO</label>
            <input value={formVip.cargo} onChange={e=>setFormVip({...formVip,cargo:e.target.value})} placeholder="Ex: Secretário Municipal" />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>NÍVEL</label>
              <select value={formVip.nivel} onChange={e=>setFormVip({...formVip,nivel:e.target.value})}>
                {["Máximo","Alto","Médio"].map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", paddingBottom:2 }}>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                <input type="checkbox" checked={formVip.ativo} onChange={e=>setFormVip({...formVip,ativo:e.target.checked})} style={{ width:"auto", accentColor:T.accent }} />
                <span style={{ fontSize:14 }}>VIP Ativo</span>
              </label>
            </div>
          </div>
          <button onClick={salvarVip} style={{ padding:14, background:`linear-gradient(135deg, ${T.accent}, ${T.accentLight})`, border:"none", borderRadius:12, color:"#0D0800", fontWeight:700, fontSize:15 }}>
            {editId?"Salvar":"Cadastrar VIP"}
          </button>
        </div>
      </div>
    );
  }

  if (formCar) {
    return (
      <div style={{ padding:"16px", paddingBottom:80 }}>
        <button onClick={()=>{setFormCar(null);setEditId(null);}} style={{ background:"transparent", border:"none", color:T.accent, fontSize:15, marginBottom:16 }}>← Voltar</button>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>{editId?"Editar":"Nova"} Viatura</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[{k:"marca",l:"MARCA *"},{k:"modelo",l:"MODELO *"},{k:"placa",l:"PLACA *"},{k:"cor",l:"COR"}].map(f=>(
            <div key={f.k}>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>{f.l}</label>
              <input value={formCar[f.k]} onChange={e=>setFormCar({...formCar,[f.k]:e.target.value})} placeholder={f.l.replace(" *","")} />
            </div>
          ))}
          <div>
            <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:1, display:"block", marginBottom:4 }}>STATUS</label>
            <select value={formCar.status} onChange={e=>setFormCar({...formCar,status:e.target.value})}>
              {["Disponível","Em uso","Manutenção","Inativo"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={salvarCar} style={{ padding:14, background:`linear-gradient(135deg, ${T.accent}, ${T.accentLight})`, border:"none", borderRadius:12, color:"#0D0800", fontWeight:700, fontSize:15 }}>
            {editId?"Salvar":"Cadastrar Viatura"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom:80 }}>
      <div style={{ padding:"16px 16px 0" }}>
        <div style={{ display:"flex", gap:2, background:T.card, borderRadius:10, padding:3, marginBottom:20 }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"8px 4px", borderRadius:8, background: tab===t.id ? T.accent : "transparent", border:"none", color: tab===t.id ? "#0D0800" : T.textMuted, fontWeight: tab===t.id ? 700 : 400, fontSize:12, transition:"all 0.2s", textAlign:"center" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"0 16px" }}>
        {tab === "colaboradores" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, color:T.textMuted }}>{users.length} colaboradores</div>
              <button onClick={()=>setFormCo({...emptyColab})} style={{ background:T.accentDim, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 14px", color:T.accent, fontSize:13, fontWeight:600 }}>+ Novo</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {users.map(u=>(
                <div key={u.id} style={{ background:T.card, border:`1px solid ${T.borderFaint}`, borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar initials={u.avatar} size={36} />
                  <div style={{ flex:1, overflow:"hidden" }}>
                    <div style={{ fontSize:14, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.nome}</div>
                    <div style={{ fontSize:12, color:T.textMuted }}>{u.funcao} · {u.turno} · Sala {u.sala}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                    {u.isGestor && <Badge label="GESTOR" color="amarelo" />}
                    <Badge label={u.ativo?"Ativo":"Inativo"} color={u.ativo?"verde":"cinza"} />
                  </div>
                  <button onClick={()=>{ setEditId(u.id); setFormCo({...u}); }} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 10px", color:T.textMuted, fontSize:12 }}>✏️</button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "vips" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, color:T.textMuted }}>{vips.length} VIPs cadastrados</div>
              <button onClick={()=>setFormVip({...emptyVip})} style={{ background:T.accentDim, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 14px", color:T.accent, fontSize:13, fontWeight:600 }}>+ Novo</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {vips.map(v=>(
                <div key={v.id} style={{ background:T.card, border:`1px solid ${T.borderFaint}`, borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                  <Avatar initials={v.foto} size={36} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{v.nome}</div>
                    <div style={{ fontSize:12, color:T.textMuted }}>{v.cargo}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                    <Badge label={v.nivel} color={v.nivel==="Máximo"?"vermelho":"amarelo"} />
                    <Badge label={v.ativo?"Ativo":"Inativo"} color={v.ativo?"verde":"cinza"} />
                  </div>
                  <button onClick={()=>{ setEditId(v.id); setFormVip({...v}); }} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 10px", color:T.textMuted, fontSize:12 }}>✏️</button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "viaturas" && (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:14, color:T.textMuted }}>{cars.length} viaturas</div>
              <button onClick={()=>setFormCar({...emptyCar})} style={{ background:T.accentDim, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 14px", color:T.accent, fontSize:13, fontWeight:600 }}>+ Nova</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {cars.map(c=>{
                const stColor = { "Disponível":T.success, "Em uso":T.info, "Manutenção":T.warning, "Inativo":T.textFaint };
                return (
                  <div key={c.id} style={{ background:T.card, border:`1px solid ${T.borderFaint}`, borderRadius:14, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:"rgba(41,128,185,0.1)", border:`1px solid rgba(41,128,185,0.2)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🚗</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600 }}>{c.marca} {c.modelo}</div>
                      <div style={{ fontSize:12, color:T.textMuted, fontFamily:"monospace" }}>{c.placa} · {c.cor}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:stColor[c.status]||T.textFaint }} />
                      <span style={{ fontSize:12, color:stColor[c.status]||T.textMuted }}>{c.status}</span>
                    </div>
                    <button onClick={()=>{ setEditId(c.id); setFormCar({...c}); }} style={{ background:"transparent", border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 10px", color:T.textMuted, fontSize:12 }}>✏️</button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// NOTIFICAÇÕES
// ============================================================
function NotifPanel({ events, user, onClose }) {
  const agora = new Date();
  const notifs = events
    .filter(e => e.colaboradores.includes(user.id) || user.isGestor)
    .filter(e => {
      const dt = new Date(`${e.data}T${e.hora}`);
      const diff = (dt - agora) / (1000*60);
      return diff > 0 && diff < 1440;
    })
    .map(e => {
      const dt = new Date(`${e.data}T${e.hora}`);
      const diff = Math.round((dt - agora)/(1000*60));
      return { ...e, diffMin: diff };
    })
    .sort((a,b) => a.diffMin - b.diffMin);

  return (
    <div style={{ position:"fixed", inset:0, background:T.overlay, zIndex:200, display:"flex", alignItems:"flex-end" }} onClick={onClose}>
      <div style={{ background:T.surface, borderRadius:"20px 20px 0 0", padding:20, width:"100%", maxHeight:"70vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:700 }}>🔔 Notificações</div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:T.textMuted, fontSize:20 }}>×</button>
        </div>
        {notifs.length === 0 ? (
          <div style={{ textAlign:"center", color:T.textMuted, padding:24 }}>Nenhuma notificação pendente</div>
        ) : notifs.map(ev => (
          <div key={ev.id} style={{ background:T.card, borderRadius:12, padding:14, marginBottom:8, borderLeft:`3px solid ${ev.diffMin<60?T.danger:T.warning}` }}>
            <div style={{ fontSize:14, fontWeight:600 }}>{ev.titulo}</div>
            <div style={{ fontSize:13, color:T.textMuted }}>📅 {ev.data} às {ev.hora}</div>
            <div style={{ fontSize:12, color: ev.diffMin<60 ? T.danger : T.warning, marginTop:4, fontWeight:600 }}>
              {ev.diffMin < 60 ? `⚠️ Em ${ev.diffMin} minutos!` : `⏰ Em ${Math.round(ev.diffMin/60)} hora(s)`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function App() {
  const [screen, setScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [users, setUsers] = useState(INITIAL_USERS);
  const [vips, setVips] = useState(INITIAL_VIPS);
  const [cars, setCars] = useState(INITIAL_CARS);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [showNotif, setShowNotif] = useState(false);

  const unreadCount = events.filter(e => {
    const dt = new Date(`${e.data}T${e.hora}`);
    const diff = (dt - new Date())/(1000*60);
    return diff > 0 && diff < 1440 && (e.colaboradores.includes(currentUser?.id) || currentUser?.isGestor);
  }).length;

  const navItems = [
    { id:"home", icon:"🏠", label:"Início" },
    { id:"agenda", icon:"📅", label:"Agenda" },
    { id:"escala", icon:"📊", label:"Escala" },
    { id:"chat", icon:"💬", label:"Chat" },
    ...(currentUser?.isGestor ? [{ id:"admin", icon:"⚙️", label:"Admin" }] : []),
  ];

  if (screen === "login") {
    return (
      <>
        <style>{css}</style>
        <LoginScreen onLogin={u => { setCurrentUser(u); setScreen("app"); }} />
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div style={{ maxWidth:430, margin:"0 auto", minHeight:"100vh", background:T.bg, position:"relative", fontFamily:font }}>
        {/* Top Bar */}
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.borderFaint}`, padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:900, color:T.accent, letterSpacing:2 }}>GUARDIAN</div>
            <div style={{ fontSize:10, fontWeight:700, color:T.textFaint, letterSpacing:3 }}>OPS</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>setShowNotif(true)} style={{ background:"transparent", border:"none", position:"relative", padding:"4px 8px", fontSize:18 }}>
              🔔
              {unreadCount > 0 && <div style={{ position:"absolute", top:2, right:2, width:16, height:16, borderRadius:"50%", background:T.danger, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"white" }}>{unreadCount}</div>}
            </button>
            <button onClick={()=>{ setScreen("login"); setCurrentUser(null); setActiveTab("home"); }} style={{ background:"transparent", border:`1px solid ${T.borderFaint}`, borderRadius:8, padding:"4px 10px", color:T.textMuted, fontSize:12 }}>Sair</button>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ overflowY:"auto", height:"calc(100vh - 106px)" }}>
          {activeTab === "home" && <HomeScreen user={currentUser} events={events} users={users} vips={vips} />}
          {activeTab === "agenda" && <AgendaScreen user={currentUser} events={events} setEvents={setEvents} users={users} vips={vips} cars={cars} />}
          {activeTab === "escala" && <EscalaScreen user={currentUser} users={users} events={events} />}
          {activeTab === "chat" && <ChatScreen user={currentUser} messages={messages} setMessages={setMessages} />}
          {activeTab === "admin" && currentUser.isGestor && <AdminScreen user={currentUser} users={users} setUsers={setUsers} vips={vips} setVips={setVips} cars={cars} setCars={setCars} />}
        </div>

        {/* Bottom Navigation */}
        <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:T.surface, borderTop:`1px solid ${T.borderFaint}`, padding:"8px 0 12px", display:"flex", zIndex:100 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={()=>setActiveTab(n.id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"transparent", border:"none", padding:"4px 0" }}>
              <span style={{ fontSize:20 }}>{n.icon}</span>
              <span style={{ fontSize:10, fontWeight:600, color: activeTab===n.id ? T.accent : T.textFaint, letterSpacing:"0.5px" }}>{n.label}</span>
              {activeTab===n.id && <div style={{ width:20, height:2, borderRadius:2, background:T.accent }} />}
            </button>
          ))}
        </div>

        {/* Notificações */}
        {showNotif && <NotifPanel events={events} user={currentUser} onClose={()=>setShowNotif(false)} />}
      </div>
    </>
  );
}
