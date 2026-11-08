# Instructor guide

## Learning objective

Students can create and explain the smallest complete Claude Managed Agents application, identify reusable resources, and distinguish a finished turn from an unusable session.

## Suggested 15-minute activity

1. **Predict (2 min).** Ask which IDs should change when starting a separate task.
2. **Observe (4 min).** Use the guided demo. Read the four lifecycle cards, then inspect the raw user, response, and idle payloads.
3. **Apply (4 min).** Continue the session to add an exercise. Start a new session from the manual controls. Compare IDs and return to the first conversation using the selector.
4. **Trace (3 min).** Open How it works. Locate the server-side key, the agent/environment creation calls, and the stream-before-send ordering.
5. **Retrieve (2 min).** Complete the quiz and explain one answer aloud.

## Review prompts

- Why can two sessions share the same agent ID without sharing conversation history?
- What does an environment ID describe? Why is it not the ID of one shared conversation?
- Why is `agent.message` insufficient to declare a successful turn?
- What would go wrong if the stream were opened after input was sent?
- Why should a browser never receive the API key?

## Demo versus live

Explain that the demo is scripted before presenting its output. It models a follow-up but does not perform real inference. Live mode uses the same host/controller and actual Managed Agents resources. Live responses vary. Use the lab-created resources, with no tools enabled, for the intended exercise.

## Common issues

| Symptom                      | Check                                                                     |
| ---------------------------- | ------------------------------------------------------------------------- |
| Live option disabled         | Set the server’s `ANTHROPIC_API_KEY` and restart Node                     |
| API authorization error      | Key permissions, workspace and Managed Agents access                      |
| Model rejected               | Configure an available Managed Agents model in `ANTHROPIC_MODEL`          |
| Reused IDs rejected          | Confirm ownership/availability of IDs in `.env` or `.data/resources.json` |
| Idle outcome needs attention | Expand the payload and read its structured stop reason                    |
| Connection interrupted       | Inspect the cloud session before sending another request                  |

## Acceptance checklist

- Students can run the demo without credentials.
- First and second sessions have different session IDs.
- Agent and environment IDs remain stable.
- Follow-up transcript stays with the first session.
- The event timeline explains the outcome and exposes inspectable JSON.
- All five quiz questions have explanatory feedback.

## Scope

Lesson 1 introduces setup and the namespace map. Threads, resources, vaults, memory stores, and deployments are previews; they are not prerequisites for this exercise. Later lessons can replace the practical scenario while preserving the same course visual language and four-activity structure.
