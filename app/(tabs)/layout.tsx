import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons'; // Biblioteca de ícones padrão do Expo

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF9AA2', // Cor do ícone ativo (Salmão)
        tabBarInactiveTintColor: '#C4C4C4', // Cor inativo (Cinza)
        headerShown: false, // Esconde o cabeçalho padrão (vamos fazer o nosso)
        tabBarStyle: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
          backgroundColor: '#FFF',
          elevation: 10, // Sombra no Android
          shadowColor: '#000', // Sombra no iOS
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
        }
      }}>
      
      {/* ABA 1: HOME (Missões) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Missões',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list' : 'list-outline'} size={28} color={color} />
          ),
        }}
      />

      {/* ABA 2: CRIAR (Botão de destaque no meio) */}
      <Tabs.Screen
        name="create"
        options={{
          title: 'Nova',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="add-circle" size={32} color={color} />
          ),
        }}
      />

      {/* ABA 3: PERFIL (Pode deletar o explore.tsx antigo depois) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Nós',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={28} color={color} />
          ),
        }}
      />

      {/* Escondendo a rota antiga se ela ainda existir */}
      <Tabs.Screen name="explore" options={{ href: null }} /> 
    </Tabs>
  );
}