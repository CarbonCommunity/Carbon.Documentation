---
title: How to Ask
description: how-to-ask
search: false
---

# On the Art of Requesting Assistance: A Treatise

## A Foreword on the Social Contract of Community Support

Welcome, traveler, to this repository of knowledge. You are here because you have encountered a challenge—a bug, a confusion, a compiler error sent from the deepest abyss to test your resolve. You seek the aid of those who have walked this path before you. This is a noble pursuit.

However, your request for aid is not a transaction. It is an appeal to a community of developers, hobbyists, and volunteers who graciously donate their time and expertise. In return, you have a single, solemn responsibility: **to ask a good question.**

A good question is a gift to the entire community. It is a well-documented problem that, once solved, becomes a beacon of knowledge for all who follow. A bad question—a hasty, context-free plea for help—is a tax on the community's time and patience. It is a puzzle with half the pieces missing.

This guide, therefore, is not merely a set of rules. It is a treatise on how to respect your own time, the time of others, and the collective knowledge of this community. Read it. Understand it. Practice it. Your success, and the sanity of our support channels, depends on it.

## Part I: The Anatomy of an Answerable Question

Every request for help must be a self-contained, comprehensive document. It must provide all necessary context to allow an expert to understand, reproduce, and solve your problem without a lengthy and frustrating interrogation.

### Section 1: The Title - Your First and Last Impression

The title is the single most important part of your request. It is what others will see first in a list of dozens of other questions. It must be dense with information.

*   **Unacceptable Titles:** "Help", "Error in plugin", "Not Working", "Question", "Compiler is mad at me", "AAAAAAAAA"
    *   *Critique:* These titles are information-free. They are the equivalent of yelling "Hey!" in a crowded room. They will be ignored.
*   **Acceptable Titles:** "Plugin fails to compile with 'CS0103: The name `GameManager` does not exist'", "`OnEntityDeath` hook not firing for specific NPC types", "How to properly despawn and respawn an entity without crashing the client", "Unexpected `NullReferenceException` when accessing `player.inventory` inside a chat command callback"
    *   *Analysis:* These titles are specific. They state the context (a hook, a command), the problem (an error code, a specific exception), and the conditions. An expert can immediately know if they are qualified to answer.

### Section 2: The Prime Directive - Your Ultimate Goal

Before you describe your problem, you must describe your intent. What are you *actually* trying to achieve? We must see the forest before we can diagnose the sick tree.

> **A Poor, Goal-Less Introduction:**
> *"My code is not working. I get an error when I try to get the player's position."*

This tells us nothing. Why do you need their position? What will you do with it? This line of questioning inevitably leads to the dreaded **XY Problem**, where you ask about your flawed solution (Y) instead of your actual goal (X).

> **A Virtuous, Goal-Oriented Introduction:**
> *"I am trying to create a plugin that teleports a player back to their sleeping bag if they type `/home`. To do this, I first need to check if they are too close to a protected monument area before allowing the teleport."*

This is magnificent. It tells us your high-level goal (a `/home` command) and your immediate technical hurdle (a proximity check). An expert might now suggest a far better, built-in API for checking protected zones that you didn't even know existed, completely bypassing your original problem. **State your goal.**

### Section 3: The Four Pillars of a Complete Request

Your request must be built upon four pillars of information. If any pillar is missing, the entire structure is unsound and likely to be condemned.

**Pillar A: The Expected Utopia - What Should Be Happening**
Describe, in clear and precise terms, the ideal outcome. What does success look like?

> **Example:** *"When a player with the `teleport.home` permission types `/home`, and they are more than 50 meters away from a monument, they should be instantly teleported to their active sleeping bag's location."*

**Pillar B: The Desolate Reality - What Is Actually Happening**
Describe the cold, hard facts of the failure. Be a detective reporting to your captain. Provide exact error messages, console logs, and observed in-game behavior.

> **Example:** *"When a player types `/home`, they receive the error message 'You do not have permission to use this command.' in chat. The server console shows the following error: `[CS0117] 'Player' does not contain a definition for 'HasPermission'`. This happens even for players I have manually added to the `teleport.home` permission group."*

**Pillar C: The Noble Struggle - What You Have Already Tried**
You must demonstrate that you have made a good-faith effort to solve your own problem. This is the most important sign of respect for the community's time. List every single thing you have tried.

> **What "I've tried everything" actually means:** You have tried one or two things, they didn't work, and you gave up. Do not say this. It is a red flag.
>
> **A Proper Chronicle of Your Efforts:**
> *"I have already taken the following steps to diagnose this:*
>
> 1.  *I have double-checked the permission name in my code (`HasPermission("teleport.home")`) and in my permission manager (`grant user MyPlayer teleport.home`). They match exactly.*
> 2.  *I have reviewed the API documentation for the `Player` object and now realize `HasPermission` might be the wrong method name.*
> 3.  *I searched the community forums for "check player permission" and found a post from last year suggesting a method called `player.HasPerm()`, but using that gives me a different compiler error: `[CS1061] 'Player' does not contain a definition for 'HasPerm' and no accessible extension method could be found.`*
> 4.  *I have confirmed the plugin is loading correctly by adding a `Puts("Home plugin loaded!")` message to the `Init` method, which appears in the console on startup."*

**Pillar D: The Lay of the Land - Your Environment and Versions**
A bug in one version may be a feature in another. We cannot see your screen. We do not know your setup. You must provide it.

> **Example:**
> *   **Carbon Framework Version:** 2.0.197
> *   **Game Server Version:** Staging/Main
> *   **Operating System:** Windows Server 2022 (or Ubuntu 22.04, etc.)
> *   **Other relevant plugins:** AdminTools v5.2, GodMode v1.8 (sometimes other plugins can interfere!)

## Part II: The Cardinal Sins of a Support Request

Committing these sins will lead to frustration, delays, and, in severe cases, your question being ceremoniously ignored.

1.  **The Sin of Vagueness:** "It's broken." "My plugin doesn't work." This is the cardinal sin. It is lazy, unhelpful, and demonstrates a complete lack of effort.
2.  **The Sin of the Code Dump:** Pasting 300 lines of your plugin's code with the simple caption "Why error?" No one will read it. Isolate the problem. Create a *Minimal, Complete, and Verifiable Example* (MCVE). Provide only the 5-10 lines of code directly related to the error.
3.  **The Sin of the Screenshot:** Posting a blurry, off-angle photograph of your monitor displaying a wall of text is an abomination. **Text is text. Code is text. Errors are text.** Copy and paste them into a proper code block. Screenshots are for demonstrating genuinely *visual* problems, like a UI element appearing in the wrong place.
4.  **The Sin of the Demanding Tone:** "I need this fixed ASAP." "Urgent help needed for my server." Your emergency is not our emergency. The community is not your personal IT department. Politeness costs nothing and yields better results.
5.  **The Sin of the Ghost:** Asking a question, getting a detailed answer or a clarifying question, and then vanishing forever. If someone helps you, have the courtesy to reply. If you solve your own problem, post the solution to help the next person.
6.  **The Sin of the Vague Pronoun:** "I tried to add it but then it gave me an error." What is "it"? What is "then"? What was the error? Be specific. Name your variables, your methods, and your errors.

## Part III: On the Presentation of Evidence

How you format your question is as important as what you put in it. An unreadable question will not be read.

*   **The Sanctity of the Code Block:** All code, all configuration, and all console logs **must** be enclosed in triple-backtick (```) code blocks. It preserves indentation and enables syntax highlighting.
    > ```csharp
    > // This is beautiful and easy to read.
    > if (player.HasPermission("teleport.home"))
    > {
    >     Puts("Player has permission!");
    > }
    > ```
*   **The Power of the Paragraph:** Do not write a single, monolithic wall of text. Your `Enter` key is a tool for creating clarity. Use it to separate your thoughts, your pillars, and your sections.
*   **The Judicious Use of Emphasis:** Use **bold** for key terms and `code formatting` for file names, method names, and other literal strings. Do not write your entire post in bold. It is the typographic equivalent of shouting.

## A Final Exhortation

You have now been given the keys to the kingdom. You know how to craft a question that is not a burden, but a contribution. You know how to show respect for the community and, in doing so, earn their respect and assistance.

Go forth and ask good questions. The knowledge you seek, and the health of this community, depends on it.
