
/* Pavoni - integração Supabase */
let supabaseClient = null;
let cachedData = [];
let currentUser = null;
let currentProfile = null;
let teamProfiles = [];

function showLoginError(message){
  const el = document.getElementById('loginError');
  if(!el) return;
  el.textContent = message || '';
  el.style.display = message ? 'block' : 'none';
}

function isConfigReady(){
  const c = window.PAVONI_CONFIG || {};
  return c.SUPABASE_URL &&
    c.SUPABASE_ANON_KEY &&
    !c.SUPABASE_URL.includes('COLE_AQUI') &&
    !c.SUPABASE_ANON_KEY.includes('COLE_AQUI');
}

async function login(){
  showLoginError('');
  if(!isConfigReady()){
    document.getElementById('configWarning').style.display='block';
    return;
  }
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if(!email || !password){
    showLoginError('Informe e-mail e senha.');
    return;
  }
  const { error } = await supabaseClient.auth.signInWithPassword({email, password});
  if(error){
    showLoginError('Não foi possível entrar. Confira e-mail e senha.');
    return;
  }
  await initializeAuthenticatedApp();
}

async function logout(){
  if(supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  cachedData = [];
  document.getElementById('appShell').style.display='none';
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('loginPassword').value='';
}

function dbRowToApp(r){
  return {
    id:r.id,
    employee:r.employee_name,
    employeeUserId:r.employee_user_id,
    role:r.role,
    period:r.period,
    type:r.evaluation_type,
    evaluator:r.evaluator_name,
    evaluatorUserId:r.evaluator_user_id,
    score:Number(r.score),
    comment:r.comment || '',
    answers:r.answers || {},
    createdAt:r.created_at
  };
}

async function loadProfile(){
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if(error || !data) throw new Error('Seu usuário existe no Auth, mas ainda não foi cadastrado na tabela profiles.');
  currentProfile = data;

  if(currentProfile.access_role === 'manager'){
    const result = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('active', true)
      .eq('access_role', 'employee')
      .order('employee_name');
    if(result.error) throw result.error;
    teamProfiles = result.data || [];
  }else{
    teamProfiles = [currentProfile];
  }
}

async function loadDataFromSupabase(){
  const { data, error } = await supabaseClient
    .from('performance_evaluations')
    .select('*')
    .order('created_at', {ascending:true});

  if(error) throw error;
  cachedData = (data || []).map(dbRowToApp);
  renderDashboard();
  renderHistory();
  renderComparison();
}

window.getData = function(){
  return cachedData;
};

function populateEmployees(){
  const selects = [
    document.getElementById('employee'),
    document.getElementById('filterName'),
    document.getElementById('compareEmployee')
  ];

  selects.forEach((sel, idx) => {
    if(!sel) return;
    const first = idx === 0 ? '<option value="">Selecione...</option>' : (idx === 1 ? '<option value="">Todos</option>' : '<option value="">Selecione...</option>');
    sel.innerHTML = first + teamProfiles.map(p =>
      `<option value="${p.employee_name}">${p.employee_name}</option>`
    ).join('');
  });

  Object.keys(roles).forEach(k => delete roles[k]);
  teamProfiles.forEach(p => roles[p.employee_name] = p.job_title);
}

function applyAccessRules(){
  document.getElementById('loggedUserName').textContent = currentProfile.employee_name;
  document.getElementById('loggedUserRole').textContent =
    currentProfile.access_role === 'manager' ? 'Gestor' : currentProfile.job_title;

  const selfMode = document.getElementById('selfMode');
  const managerMode = document.getElementById('managerMode');
  const employeeSelect = document.getElementById('employee');

  if(currentProfile.access_role === 'manager'){
    if(selfMode) selfMode.style.display='none';
    if(managerMode) managerMode.style.display='block';
    setMode('manager');
    employeeSelect.disabled = false;
  }else{
    if(managerMode) managerMode.style.display='none';
    if(selfMode) selfMode.style.display='block';
    setMode('self');
    employeeSelect.value = currentProfile.employee_name;
    employeeSelect.disabled = true;
    autoRole();

    const dashboardLink = document.querySelector('.nav a[href="#dashboardTab"]');
    const compareLink = document.querySelector('.nav a[href="#compareTab"]');
    if(dashboardLink) dashboardLink.style.display='none';
    if(compareLink) compareLink.style.display='none';

    const dash = document.getElementById('dashboardTab');
    const compare = document.getElementById('compareTab');
    if(dash) dash.style.display='none';
    if(compare) compare.style.display='none';
  }
}

window.saveEvaluation = async function(){
  try{
    const employee = document.getElementById('employee').value;
    const role = document.getElementById('role').value;
    const period = document.getElementById('period').value.trim();

    if(!employee || !role || !period){
      alert('Preencha colaborador e período.');
      return;
    }

    const answers = {};
    for(const q of questions){
      const s = document.querySelector(`input[name="${q.id}"]:checked`);
      if(!s){
        alert(`Responda: ${q.title}`);
        return;
      }
      answers[q.id] = Number(s.value);
    }

    let employeeProfile;
    let type;
    let evaluatorName;

    if(currentProfile.access_role === 'manager'){
      employeeProfile = teamProfiles.find(p => p.employee_name === employee);
      if(!employeeProfile) throw new Error('Colaborador não encontrado no Supabase.');
      type = 'Análise da liderança';
      evaluatorName = currentProfile.employee_name;
    }else{
      employeeProfile = currentProfile;
      type = 'Autoavaliação';
      evaluatorName = currentProfile.employee_name;
    }

    const payload = {
      employee_user_id: employeeProfile.id,
      employee_name: employeeProfile.employee_name,
      role: employeeProfile.job_title,
      period,
      evaluation_type: type,
      evaluator_user_id: currentUser.id,
      evaluator_name: evaluatorName,
      score: weightedScore(answers),
      answers,
      comment: document.getElementById('generalComment').value.trim() || null
    };

    const { error } = await supabaseClient
      .from('performance_evaluations')
      .insert(payload);

    if(error) throw error;

    alert(`${type} de ${employeeProfile.employee_name} salva com sucesso.`);
    resetForm();

    if(currentProfile.access_role === 'employee'){
      document.getElementById('employee').value=currentProfile.employee_name;
      document.getElementById('employee').disabled=true;
      autoRole();
    }else{
      setMode('manager');
    }

    await loadDataFromSupabase();
  }catch(err){
    console.error(err);
    alert('Não foi possível salvar. ' + (err.message || 'Verifique a conexão com o Supabase.'));
  }
};

window.deleteRecord = async function(id){
  if(currentProfile?.access_role !== 'manager'){
    alert('Somente o gestor pode excluir avaliações.');
    return;
  }
  if(!confirm('Excluir esta avaliação?')) return;

  const { error } = await supabaseClient
    .from('performance_evaluations')
    .delete()
    .eq('id', id);

  if(error){
    alert('Não foi possível excluir: ' + error.message);
    return;
  }
  await loadDataFromSupabase();
};

window.clearAll = async function(){
  if(currentProfile?.access_role !== 'manager'){
    alert('Somente o gestor pode apagar avaliações.');
    return;
  }
  if(!confirm('Apagar todos os registros? Esta ação não pode ser desfeita.')) return;

  const ids = cachedData.map(r => r.id);
  if(!ids.length) return;

  const { error } = await supabaseClient
    .from('performance_evaluations')
    .delete()
    .in('id', ids);

  if(error){
    alert('Não foi possível apagar: ' + error.message);
    return;
  }
  await loadDataFromSupabase();
};

async function initializeAuthenticatedApp(){
  try{
    const { data:{ user } } = await supabaseClient.auth.getUser();
    if(!user) return;
    currentUser = user;
    await loadProfile();
    populateEmployees();
    applyAccessRules();
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('appShell').style.display='';
    await loadDataFromSupabase();

    if(currentProfile.access_role === 'employee'){
      document.getElementById('formTab')?.scrollIntoView({block:'start'});
    }
  }catch(err){
    console.error(err);
    showLoginError(err.message || 'Erro ao carregar o usuário.');
    document.getElementById('appShell').style.display='none';
    document.getElementById('loginScreen').style.display='flex';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if(!isConfigReady()){
    document.getElementById('configWarning').style.display='block';
    return;
  }

  supabaseClient = window.supabase.createClient(
    window.PAVONI_CONFIG.SUPABASE_URL,
    window.PAVONI_CONFIG.SUPABASE_ANON_KEY
  );

  const { data:{ session } } = await supabaseClient.auth.getSession();
  if(session){
    await initializeAuthenticatedApp();
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if(event === 'SIGNED_IN' && session) await initializeAuthenticatedApp();
    if(event === 'SIGNED_OUT') await logout();
  });
});
