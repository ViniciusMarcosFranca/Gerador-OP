import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const TABLES = [
  { id: 'clients', name: 'Clientes', fields: [{ key: 'name', label: 'Nome' }, { key: 'cnpj', label: 'CNPJ' }] },
  { id: 'op_types', name: 'Tipos de OP', fields: [{ key: 'name', label: 'Nome (Ex: Impressão, Laminação)' }] },
  { id: 'line_types', name: 'Tipos de Linha', fields: [{ key: 'name', label: 'Nome' }, { key: 'recipe_type', label: 'Tipo de Receita' }] },
  { id: 'screen_types', name: 'Tipos de Tela', fields: [{ key: 'name', label: 'Nome' }] },
  { id: 'knife_types', name: 'Tipos de Faca', fields: [{ key: 'name', label: 'Nome' }] },
  { id: 'board_types', name: 'Tipos de Board', fields: [{ key: 'name', label: 'Nome' }] },
];

export default function Cadastros() {
  const [activeTable, setActiveTable] = useState(TABLES[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchData();
    setFormData({});
    setEditingId(null);
  }, [activeTable]);

  async function fetchData() {
    setLoading(true);
    const { data: result, error } = await supabase
      .from(activeTable.id)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setData(result);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (editingId) {
      const { error } = await supabase.from(activeTable.id).update(formData).eq('id', editingId);
      if (!error) fetchData();
    } else {
      const { error } = await supabase.from(activeTable.id).insert([formData]);
      if (!error) fetchData();
    }
    setFormData({});
    setEditingId(null);
  }

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza que deseja excluir?')) return;
    const { error } = await supabase.from(activeTable.id).delete().eq('id', id);
    if (!error) fetchData();
    else alert('Erro ao excluir: ' + error.message);
  }

  function handleEdit(item) {
    setFormData(item);
    setEditingId(item.id);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Cadastros de Apoio</h1>
      
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {TABLES.map(table => (
          <button
            key={table.id}
            onClick={() => setActiveTable(table)}
            className={`px-4 py-2 rounded-md whitespace-nowrap text-sm font-medium ${
              activeTable.id === table.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {table.name}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h2 className="text-lg font-medium mb-4">{editingId ? 'Editar' : 'Adicionar'} {activeTable.name}</h2>
        <form onSubmit={handleSubmit} className="flex gap-4 items-end">
          {activeTable.fields.map(field => (
            <div key={field.key} className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData[field.key] || ''}
                onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
              />
            </div>
          ))}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center"
          >
            {editingId ? 'Salvar' : <><Plus className="w-4 h-4 mr-1" /> Adicionar</>}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setFormData({}); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 font-medium"
            >
              Cancelar
            </button>
          )}
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {activeTable.fields.map(field => (
                <th key={field.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {field.label}
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="100%" className="px-6 py-4 text-center text-gray-500">Carregando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="100%" className="px-6 py-4 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
            ) : (
              data.map(item => (
                <tr key={item.id}>
                  {activeTable.fields.map(field => (
                    <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item[field.key]}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
