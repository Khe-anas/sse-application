package com.sse.service;

import com.sse.dto.ChatRequest;
import com.sse.dto.ChatResponse;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ChatbotService {
    
    private final Map<String, String> keywordResponses = new LinkedHashMap<>();
    private final Map<String, List<String>> suggestions = new LinkedHashMap<>();
    
    public ChatbotService() {
        initResponses();
    }
    
    private void initResponses() {
        // Greetings
        keywordResponses.put("bonjour|salut|hello|hi|bonsoir", 
            "Bonjour ! Je suis l'assistant virtuel du SSE (Système de Suivi et d'Évaluation). Je peux vous aider avec :\n\n" +
            "- Les évaluations de gouvernance\n" +
            "- Les 12 principes de bonne gouvernance\n" +
            "- Le calcul des scores et niveaux de maturité\n" +
            "- Le processus de validation\n" +
            "- La labellisation\n\n" +
            "Comment puis-je vous aider aujourd'hui ?");
        suggestions.put("bonjour|salut|hello|hi|bonsoir", 
            List.of("Comment remplir une évaluation ?", "Quels sont les 12 principes ?", "Comment sont calculés les scores ?"));
        
        // Evaluation
        keywordResponses.put("évaluation|eval|remplir|evaluation|formulaire",
            "Pour remplir une évaluation :\n\n" +
            "1. Connectez-vous avec votre compte Responsable\n" +
            "2. Accédez à votre tableau de bord\n" +
            "3. Cliquez sur l'évaluation assignée\n" +
            "4. Remplissez les critères principe par principe (12 au total)\n" +
            "5. Pour chaque critère, sélectionnez un niveau :\n" +
            "   - 0 : N'existe pas\n" +
            "   - 1 : En cours\n" +
            "   - 2 : Réalisé\n" +
            "   - 3 : Validé\n" +
            "6. Ajoutez des commentaires et des preuves\n" +
            "7. Sauvegardez régulièrement\n" +
            "8. Soumettez quand tout est rempli\n\n" +
            "Vous pouvez sauvegarder en brouillon à tout moment.");
        suggestions.put("évaluation|eval|remplir|evaluation|formulaire",
            List.of("Quels sont les 12 principes ?", "Quelles preuves sont acceptées ?", "Comment sont calculés les scores ?"));
        
        // 12 Principes
        keywordResponses.put("principe|principes|12|douze",
            "Les 12 principes de bonne gouvernance sont :\n\n" +
            "1. **Finalité** - Mission et valeurs de l'organisme\n" +
            "2. **Création de valeur** - Performance et optimisation\n" +
            "3. **Stratégie** - Planification et objectifs\n" +
            "4. **Surveillance** - Contrôle et suivi\n" +
            "5. **Redevabilité** - Transparence et responsabilité\n" +
            "6. **Dialogue avec les parties prenantes** - Participation citoyenne\n" +
            "7. **Leadership** - Direction et encadrement\n" +
            "8. **Données et décisions** - Gouvernance basée sur les données\n" +
            "9. **Gouvernance du risque** - Gestion des risques\n" +
            "10. **Responsabilité sociétale** - Impact social et environnemental\n" +
            "11. **Viabilité et pérennité** - Durabilité à long terme\n" +
            "12. **Maîtrise de la corruption** - Lutte anti-corruption\n\n" +
            "Chaque principe contient des bonnes pratiques et des critères à évaluer.");
        suggestions.put("principe|principes|12|douze",
            List.of("Comment remplir une évaluation ?", "Comment sont calculés les scores ?", "Qu'est-ce que la maturité ?"));
        
        // Score calculation
        keywordResponses.put("score|calcul|calculer|note|point",
            "Les scores sont calculés comme suit :\n\n" +
            "**Score par principe :**\n" +
            "- Somme des niveaux des critères ÷ (Nombre de critères × 3) × 100\n" +
            "- Exemple : 5 critères avec niveaux [2, 3, 1, 2, 3]\n" +
            "  Score = (2+3+1+2+3) ÷ (5×3) × 100 = 11 ÷ 15 × 100 = **73.3%**\n\n" +
            "**Score global :**\n" +
            "- Moyenne pondérée des 12 principes\n" +
            "- Par défaut, tous les principes ont un poids égal (1.0)\n\n" +
            "**Niveaux de maturité :**\n" +
            "- 0-25% : Initial\n" +
            "- 25-50% : En progression\n" +
            "- 50-75% : Avancé\n" +
            "- 75-100% : Excellent");
        suggestions.put("score|calcul|calculer|note|point",
            List.of("Qu'est-ce que la maturité ?", "Quels sont les 12 principes ?", "Comment remplir une évaluation ?"));
        
        // Maturity
        keywordResponses.put("maturité|maturite|niveau|level",
            "Les 4 niveaux de maturité en gouvernance :\n\n" +
            "**Initial (0-25%)**\n" +
            "- Pratiques informelles ou absentes\n" +
            "- Aucune documentation\n" +
            "- Actions requises urgentes\n\n" +
            "**En progression (25-50%)**\n" +
            "- Début de formalisation\n" +
            "- Processus partiellement documentés\n" +
            "- Améliorations en cours\n\n" +
            "**Avancé (50-75%)**\n" +
            "- Pratiques établies et documentées\n" +
            "- Suivi régulier\n" +
            "- Bonne conformité\n\n" +
            "**Excellent (75-100%)**\n" +
            "- Excellente gouvernance\n" +
            "- Pratiques optimisées et validées\n" +
            "- Labellisation possible");
        suggestions.put("maturité|maturite|niveau|level",
            List.of("Comment sont calculés les scores ?", "Qu'est-ce que la labellisation ?", "Quels sont les 12 principes ?"));
        
        // Proofs
        keywordResponses.put("preuve|preuves|document|fichier|upload|justificatif",
            "Les types de preuves acceptés :\n\n" +
            "- **Documents officiels** : statuts, décrets, lois\n" +
            "- **Rapports** : rapports d'activité, rapports financiers, rapports d'audit\n" +
            "- **Procès-verbaux** : PV de réunions, décisions\n" +
            "- **Politiques** : codes d'éthique, politiques internes\n" +
            "- **Tableaux de bord** : indicateurs de performance\n" +
            "- **Plans** : plans stratégiques, plans d'action\n\n" +
            "Formats acceptés : PDF, Word, Excel, images (PNG, JPG)\n" +
            "Taille maximale : 10 Mo par fichier\n\n" +
            "Vous pouvez aussi ajouter des liens URL vers des documents en ligne.");
        suggestions.put("preuve|preuves|document|fichier|upload|justificatif",
            List.of("Comment remplir une évaluation ?", "Quels sont les 12 principes ?", "Comment sont calculés les scores ?"));
        
        // Validation
        keywordResponses.put("validation|valider|validate|correcteur|gouvernement",
            "Le processus de validation :\n\n" +
            "1. **Soumission** : Le Responsable soumet l'évaluation\n" +
            "2. **Examen** : Le Gouvernement examine chaque réponse\n" +
            "3. **Décision par critère** :\n" +
            "   - Valider : la réponse est acceptée\n" +
            "   - Rejeter : la réponse est refusée avec motif\n" +
            "   - Demander correction : retour au Responsable\n" +
            "4. **Validation finale** : Si tout est validé, le score est calculé\n" +
            "5. **Notification** : Le Responsable est informé du résultat\n\n" +
            "Le calcul automatique détermine le niveau de maturité et le classement.");
        suggestions.put("validation|valider|validate|correcteur|gouvernement",
            List.of("Comment remplir une évaluation ?", "Qu'est-ce que la maturité ?", "Comment sont calculés les scores ?"));
        
        // Labellisation
        keywordResponses.put("labellisation|label|certification|reconnaissance",
            "La labellisation en bonne gouvernance :\n\n" +
            "- Attribuée aux organismes atteignant le niveau **Excellent (75%+)**\n" +
            "- Basée sur l'évaluation complète des 12 principes\n" +
            "- Validée par le Gouvernement\n" +
            "- Renouvelable annuellement\n\n" +
            "**Avantages :**\n" +
            "- Reconnaissance officielle\n" +
            "- Visibilité publique\n" +
            "- Confiance des parties prenantes\n" +
            "- Référence pour les bonnes pratiques\n\n" +
            "Le classement public permet de comparer les organismes.");
        suggestions.put("labellisation|label|certification|reconnaissance",
            List.of("Qu'est-ce que la maturité ?", "Comment sont calculés les scores ?", "Quels sont les 12 principes ?"));
        
        // Ranking
        keywordResponses.put("classement|ranking|rang|position|comparer",
            "Le classement des organismes :\n\n" +
            "- Basé sur le **score global** de l'évaluation validée\n" +
            "- Classé du plus haut au plus bas score\n" +
            "- Filtrable par type (Public, Privé, Société civile)\n" +
            "- Historique sur plusieurs années\n" +
            "- Tendance : progression, régression, stable\n\n" +
            "Accessible dans le tableau de bord Gouvernement.\n" +
            "Le Responsable peut voir le classement de son organisme.");
        suggestions.put("classement|ranking|rang|position|comparer",
            List.of("Comment sont calculés les scores ?", "Qu'est-ce que la labellisation ?", "Quels sont les 12 principes ?"));
        
        // Correction
        keywordResponses.put("correction|corriger|modifier|changer|rectifier",
            "Pour corriger une réponse :\n\n" +
            "1. Le Gouvernement demande une correction avec un commentaire\n" +
            "2. Vous recevez une notification\n" +
            "3. Accédez à l'évaluation dans votre tableau de bord\n" +
            "4. Modifiez le critère concerné\n" +
            "5. Changez le niveau, le commentaire ou les preuves\n" +
            "6. Resoumettez l'évaluation\n\n" +
            "Les corrections sont marquées en orange dans le formulaire.");
        suggestions.put("correction|corriger|modifier|changer|rectifier",
            List.of("Comment remplir une évaluation ?", "Quelles preuves sont acceptées ?", "Comment sont calculés les scores ?"));
        
        // Aide / Support
        keywordResponses.put("aide|help|support|assistance|contact|problème|problem|erreur|error",
            "Besoin d'aide ?\n\n" +
            "**Contact support SSE :**\n" +
            "- Email : support@sse.gouv.tn\n" +
            "- Téléphone : +216 71 000 000\n" +
            "- Horaires : Lun-Ven, 8h30-17h30\n\n" +
            "**Ressources disponibles :**\n" +
            "- Guide utilisateur en ligne\n" +
            "- FAQ complète\n" +
            "- Tutoriels vidéo\n\n" +
            "Pour une question technique, précisez votre rôle et le problème rencontré.");
        suggestions.put("aide|help|support|assistance|contact|problème|problem|erreur|error",
            List.of("Comment remplir une évaluation ?", "Quels sont les 12 principes ?", "Quelles preuves sont acceptées ?"));
    }
    
    public ChatResponse processMessage(ChatRequest request) {
        String message = request.getMessage().toLowerCase();
        String sessionId = request.getSessionId() != null ? request.getSessionId() : UUID.randomUUID().toString();
        
        // Find matching response
        String response = findResponse(message);
        List<String> suggested = findSuggestions(message);
        
        return new ChatResponse(response, suggested, sessionId);
    }
    
    private String findResponse(String message) {
        for (Map.Entry<String, String> entry : keywordResponses.entrySet()) {
            String[] keywords = entry.getKey().split("\\|");
            for (String keyword : keywords) {
                if (message.contains(keyword.toLowerCase())) {
                    return entry.getValue();
                }
            }
        }
        
        return "Je n'ai pas compris votre question. Voici ce que je peux vous aider à faire :\n\n" +
               "- Comprendre les 12 principes de gouvernance\n" +
               "- Remplir votre évaluation\n" +
               "- Comprendre le calcul des scores\n" +
               "- Savoir quelles preuves sont acceptées\n" +
               "- Comprendre la validation et la labellisation\n\n" +
               "Posez-moi une question plus précise ou sélectionnez une suggestion ci-dessous.";
    }
    
    private List<String> findSuggestions(String message) {
        for (Map.Entry<String, List<String>> entry : suggestions.entrySet()) {
            String[] keywords = entry.getKey().split("\\|");
            for (String keyword : keywords) {
                if (message.contains(keyword.toLowerCase())) {
                    return entry.getValue();
                }
            }
        }
        return List.of("Comment remplir une évaluation ?", "Quels sont les 12 principes ?", "Comment sont calculés les scores ?", "Aide");
    }
}
