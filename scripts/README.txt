Migracao do Bolao da Galera para o Supabase novo (dtfqmxmmbbfmfpouzqzt)
========================================================================

Como rodar:

1. Abra o SQL Editor do projeto novo:
   https://supabase.com/dashboard/project/dtfqmxmmbbfmfpouzqzt/sql/new

2. Cole e rode CADA arquivo na ordem (clique em "Run" depois de colar):

   01-tables.sql         32 tabelas (CREATE TABLE IF NOT EXISTS)
   02-constraints.sql    PRIMARY KEYs, UNIQUEs e CHECKs
   03-functions.sql      24 funcoes/RPCs do app
   04-indexes.sql        50+ indexes para performance
   05-foreign-keys.sql   Foreign keys entre tabelas
   06-triggers.sql       Triggers (public + auth.users)
   07-rls-policies.sql   Row Level Security + policies
   08-seed.sql           Buckets de storage + campeonatos

3. Cada arquivo eh idempotente: pode rodar 2x sem quebrar.

4. Se algum arquivo falhar, rode-o novamente apos corrigir.
