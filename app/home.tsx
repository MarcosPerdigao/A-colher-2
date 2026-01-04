import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';

// Dados fictícios (MOCK) para visualizar as tarefas
const tarefasMock = [
  { id: 1, titulo: 'Lavar a louça do jantar', pontos: 50, status: 'pendente', dono: 'Marcos' },
  { id: 2, titulo: 'Passear com o cachorro', pontos: 30, status: 'pendente', dono: 'Ela' },
  { id: 3, titulo: 'Comprar pão', pontos: 10, status: 'concluida', dono: 'Marcos' },
];

export default function Home() {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'concluidas'>('pendentes');

  // Filtra as tarefas pela aba selecionada
  const tarefasExibidas = tarefasMock.filter(t => 
    abaAtiva === 'pendentes' ? t.status === 'pendente' : t.status === 'concluida'
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8E1" />
      
      {/* --- CABEÇALHO --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saudacao}>Olá, Casal!</Text>
          <Text style={styles.subtitulo}>Quem vai fazer o que hoje?</Text>
        </View>
        <TouchableOpacity style={styles.avatar}>
          <Text style={styles.avatarTexto}>M</Text>
        </TouchableOpacity>
      </View>

      {/* --- BOTÃO DO "JUIZ" (Destaque) --- */}
      <TouchableOpacity style={styles.cardJuiz}>
        <Text style={styles.emojiJuiz}>⚖️</Text>
        <View>
          <Text style={styles.tituloJuiz}>O Juiz</Text>
          <Text style={styles.descJuiz}>Resolver uma disputa agora</Text>
        </View>
      </TouchableOpacity>

      {/* --- ABAS (Pendentes / Concluídas) --- */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, abaAtiva === 'pendentes' && styles.tabAtiva]}
          onPress={() => setAbaAtiva('pendentes')}
        >
          <Text style={[styles.tabTexto, abaAtiva === 'pendentes' && styles.tabTextoAtivo]}>
            A Fazer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, abaAtiva === 'concluidas' && styles.tabAtiva]}
          onPress={() => setAbaAtiva('concluidas')}
        >
          <Text style={[styles.tabTexto, abaAtiva === 'concluidas' && styles.tabTextoAtivo]}>
            Concluídas
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- LISTA DE TAREFAS (Cards) --- */}
      <ScrollView contentContainerStyle={styles.listaTarefas}>
        {tarefasExibidas.map((tarefa) => (
          <View key={tarefa.id} style={styles.cardTarefa}>
            <View style={styles.infoTarefa}>
              <Text style={styles.tituloTarefa}>{tarefa.titulo}</Text>
              <View style={styles.badgePontos}>
                <Text style={styles.textoPontos}>{tarefa.pontos} pts</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.botaoCheck}>
              <Text style={styles.textoCheck}>
                {abaAtiva === 'pendentes' ? 'Concluir' : 'Desfazer'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {tarefasExibidas.length === 0 && (
          <Text style={styles.textoVazio}>Nenhuma tarefa por aqui! 🍃</Text>
        )}
      </ScrollView>

      {/* Botão de teste para sair (provisório) */}
      <TouchableOpacity onPress={() => router.replace('/')} style={styles.botaoSair}>
        <Text style={{color: '#A1887F'}}>Sair</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

// --- ESTILOS (Tons Pastéis & Coral) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1', // Fundo Creme
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  saudacao: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5D4037', // Marrom Café
  },
  subtitulo: {
    fontSize: 14,
    color: '#8D6E63',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFAB91', // Coral
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  // ESTILOS DO JUIZ
  cardJuiz: {
    backgroundColor: '#D1C4E9', // Roxo Pastel bem suave (Diferente do resto)
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emojiJuiz: {
    fontSize: 30,
    marginRight: 15,
  },
  tituloJuiz: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4527A0',
  },
  descJuiz: {
    fontSize: 14,
    color: '#5E35B1',
  },
  // TABS
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  tab: {
    marginRight: 20,
    paddingBottom: 5,
  },
  tabAtiva: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFAB91', // Coral
  },
  tabTexto: {
    fontSize: 16,
    color: '#A1887F',
    fontWeight: '600',
  },
  tabTextoAtivo: {
    color: '#5D4037', // Marrom Escuro
    fontWeight: 'bold',
  },
  // LISTA
  listaTarefas: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardTarefa: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoTarefa: {
    flex: 1,
  },
  tituloTarefa: {
    fontSize: 16,
    color: '#5D4037',
    fontWeight: '500',
    marginBottom: 5,
  },
  badgePontos: {
    backgroundColor: '#FFF3E0', // Laranja bem clarinho
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  textoPontos: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  botaoCheck: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  textoCheck: {
    fontSize: 12,
    color: '#757575',
    fontWeight: 'bold',
  },
  textoVazio: {
    textAlign: 'center',
    color: '#BCAAA4',
    marginTop: 20,
    fontStyle: 'italic',
  },
  botaoSair: {
    alignSelf: 'center',
    marginTop: 10,
    padding: 10
  }
});