import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    items: 0,
    clients: 0,
    ops: 0
  });

  useEffect(() => {
    async function fetchStats() {
      const [items, clients, ops] = await Promise.all([
        supabase.from('items').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('production_orders').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        items: items.count || 0,
        clients: clients.count || 0,
        ops: ops.count || 0
      });
    }

    fetchStats();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Painel de Controle</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total de Itens</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.items}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total de Clientes</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.clients}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">OPs Emitidas</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.ops}</p>
        </div>
      </div>
    </div>
  );
}
