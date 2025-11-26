import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, View, Button, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SQLite from 'expo-sqlite';
import {
  openDatabase,
  createTable,
  inserirDados,
  exibirUsuarios,
  alterarRegistro,
  deletarRegistro,
  Usuario
} from './Banco/Config';

type SQLiteDatabase = SQLite.SQLiteDatabase | undefined;

export default function App() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [idEdicao, setIdEdicao] = useState<number | null>(null);
  const [db, setDb] = useState<SQLiteDatabase>(undefined);
  const [lUs, setUsuario] = useState<Usuario[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);

  // Carrega os usuários do banco
  async function carregaUsuarios(database: SQLiteDatabase) {
    if (database) {
      const users = await exibirUsuarios(database);
      setUsuario(users || []);
    }
  }

  // Inicializa o banco de dados
  async function initializeDatabase() {
    const database = await openDatabase();
    if (database) {
      await createTable(database);
      setDb(database);
      await carregaUsuarios(database);
      setIsDbReady(true);
    }
  }

  useEffect(() => {
    initializeDatabase();
  }, []);

  // Limpa os campos do formulário
  const limparCampos = () => {
    setNome('');
    setEmail('');
    setIdEdicao(null);
  };

  // Cadastra ou Edita usuário
  async function handleAcaoPrincipal() {
    // 1. Verifica se estão vazios
    if (!nome || !email) {
      Alert.alert('Atenção', 'Nome e E-mail são obrigatórios!');
      return;
    }

    // 2. NOVA VALIDAÇÃO: Verifica se tem @ no email
   const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!regexEmail.test(email)) {
      Alert.alert('E-mail Inválido', 'Por favor, digite um e-mail válido (ex: teste@email.com)');
      return;
    } 

    if (!db) return;

    if (idEdicao !== null) {
      await alterarRegistro(nome, email, idEdicao, db);
    } else {
      await inserirDados(nome, email, db);
    }

    await carregaUsuarios(db);
    limparCampos();
  }

  // Prepara para edição
  const selecionarParaEdicao = (usuario: Usuario) => {
    setNome(usuario.NOME_US);
    setEmail(usuario.EMAIL_US);
    setIdEdicao(usuario.ID_US);
  };

  // Deleta usuário
  const deletar = (id: number) => {
    Alert.alert(
      'Confirmação',
      `Tem certeza que deseja deletar o usuário ID ${id}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          onPress: async () => {
            if (db) {
              await deletarRegistro(id, db);
              await carregaUsuarios(db);
              if (idEdicao === id) {
                limparCampos();
              }
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };


  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* --- INÍCIO DO FORMULÁRIO --- */}
      <View style={styles.formContainer}>
        <Text style={styles.title}>{idEdicao !== null ? 'Editar Usuário' : 'Novo Cadastro'}</Text>

        <Text style={styles.label}>Nome:</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu nome"
          placeholderTextColor="#C7C7CD"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>E-mail:</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu E-mail"
          placeholderTextColor="#C7C7CD"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        {/* Botões de Cadastrar/Salvar e Cancelar */}
        <View style={styles.buttonRow}>
          <View style={styles.buttonWrapper}>
            <Button
              title={idEdicao !== null ? 'Salvar Alterações' : 'Cadastrar'}
              onPress={handleAcaoPrincipal}
              color={idEdicao !== null ? '#FFC107' : '#BB86FC'}
              disabled={!isDbReady}
            />
          </View>
          {idEdicao !== null && (
            <View style={styles.buttonWrapper}>
              <Button
                title='Cancelar Edição'
                onPress={limparCampos}
                color='#CF6679'
                disabled={!isDbReady}
              />
            </View>
          )}
        </View>

      </View>
      {/* --- FIM DO FORMULÁRIO --- */}

      {/* Cabeçalho da Lista */}
      <View style={styles.listHeaderContainer}>
        <Text style={styles.listHeaderTitle}>Usuários Registrados ({lUs.length})</Text>
      </View>

      {/* Lista com Scroll */}
      <ScrollView style={styles.scrollView}>
        {!isDbReady ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#BB86FC" />
            <Text style={styles.loadingText}>Carregando banco de dados...</Text>
          </View>
        ) : lUs.length === 0 ? (
          <Text style={styles.emptyListText}>Nenhum usuário cadastrado.</Text>
        ) : (
          lUs.map((x) => (
            <View key={x.ID_US} style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.iconPlaceholder}>
                  <Text style={styles.iconText}>{x.NOME_US.charAt(0).toUpperCase()}</Text>
                </View>

                <View style={styles.info}>
                  <Text style={styles.cardTextBold}>ID: {x.ID_US}</Text>
                  <Text style={styles.cardText}>Nome: {x.NOME_US}</Text>
                  <Text style={styles.cardText}>Email: {x.EMAIL_US}</Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FFC107', marginBottom: 8 }]}
                    onPress={() => selecionarParaEdicao(x)}
                  >
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#F44336' }]}
                    onPress={() => deletar(x.ID_US)}
                  >
                    <Text style={styles.actionButtonText}>Deletar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',  // Branco de fundo
    paddingTop: 80,
    alignItems: 'center',
    color: '#000000',  // Texto escuro
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FB6F92',  // Cor do título
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    width: '90%',
    padding: 20,
    backgroundColor: '#FFFFFF',  // Fundo branco para o formulário
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDDDDD',  // Borda clara
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',  // Texto escuro
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    height: 45,
    borderColor: '#FB6F92',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 15,
    fontSize: 16,
    backgroundColor: '#F5F5F5',  // Fundo do campo de entrada
    marginBottom: 10,
    color: '#000000',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  listHeaderContainer: {
    width: '90%',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#FB6F92',  // Linha de separação
    marginBottom: 10,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'left',
  },
  scrollView: {
    width: '100%',
    paddingHorizontal: '5%',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 0,
    marginLeft: 10,
    fontSize: 16,
    color: '#FB6F92',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#A0A0A0',
  },
  card: {
    backgroundColor: '#FFFFFF',  // Fundo branco para os cards
    marginVertical: 8,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#FB6F92',  // Borda esquerda colorida
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFC2D1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FB6F92',
  },
  info: {
    flex: 2,
  },
  cardTextBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  cardText: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  actions: {
    flex: 1,
    marginLeft: 10,
    alignItems: 'flex-end',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 5,
    width: '90%',
    alignItems: 'center',
    marginBottom: 5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
