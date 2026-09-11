const { supabaseAdmin } = require('../config/supabase');
require('dotenv').config();

async function seedUsers() {
  console.log('--- A verificar utilizadores de teste no Supabase ---');
  
  const testUsers = [
    {
      email: process.env.TEST_STUDENT_EMAIL || 'estudante.teste@ucm.ac.mz',
      password: process.env.TEST_STUDENT_PASSWORD,
      full_name: 'Estudante Teste',
      course: 'Licenciatura em Tecnologias da Informação',
      role: 'student'
    },
    {
      email: process.env.TEST_ADMIN_EMAIL || 'admin.pemba@ucm.ac.mz',
      password: process.env.TEST_ADMIN_PASSWORD,
      full_name: 'Administrador Pemba',
      course: 'Licenciatura em Tecnologias da Informação',
      role: 'admin'
    }
  ];

  for (const tu of testUsers) {
    if (!tu.password) {
      console.log(`[AVISO]: Senha não definida nas variáveis de ambiente para ${tu.email}. Ignorando criação.`);
      continue;
    }
    console.log(`\nA processar utilizador: ${tu.email}`);
    
    const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      console.error('Erro ao listar utilizadores:', listErr.message);
      continue;
    }

    let existing = usersList?.users?.find(u => u.email.toLowerCase() === tu.email.toLowerCase());
    let userId;

    if (existing) {
      console.log(`Utilizador ${tu.email} já existe em auth.users (ID: ${existing.id}). A atualizar palavra-passe e confirmação...`);
      userId = existing.id;
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tu.password,
        email_confirm: true,
        user_metadata: { full_name: tu.full_name, course: tu.course, role: tu.role }
      });
      if (updErr) console.error('Erro ao atualizar user:', updErr.message);
    } else {
      console.log(`A criar novo utilizador ${tu.email}...`);
      const { data: created, error: crtErr } = await supabaseAdmin.auth.admin.createUser({
        email: tu.email,
        password: tu.password,
        email_confirm: true,
        user_metadata: { full_name: tu.full_name, course: tu.course, role: tu.role }
      });
      if (crtErr) {
        console.error('Erro ao criar user:', crtErr.message);
        continue;
      }
      userId = created.user.id;
    }

    // Upsert no public.profiles
    const { data: prof, error: profErr } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: tu.email,
        full_name: tu.full_name,
        course: tu.course,
        campus: 'Campus de Pemba',
        role: tu.role,
        status: 'active'
      })
      .select()
      .single();

    if (profErr) {
      console.error('Erro ao criar/atualizar perfil:', profErr.message);
    } else {
      console.log(`Perfil sincronizado com sucesso: ${prof.email} (Role: ${prof.role})`);
    }
  }

  console.log('\n--- Concluído com sucesso! ---');
  process.exit(0);
}

seedUsers().catch(e => {
  console.error('Falha fatal:', e);
  process.exit(1);
});
