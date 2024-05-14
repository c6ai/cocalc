/*
 *  This file is part of CoCalc: Copyright © 2024 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

import type { MenuProps } from "antd";
import { Button, Dropdown, Space, Tooltip } from "antd";

import { CSS, redux, useTypedRedux } from "@cocalc/frontend/app-framework";
import { Icon, Text } from "@cocalc/frontend/components";
import { LanguageModelVendorAvatar } from "@cocalc/frontend/components/language-model-icon";
import {
  LLMModelPrice,
  modelToName,
} from "@cocalc/frontend/frame-editors/llm/llm-selector";
import { useProjectContext } from "@cocalc/frontend/project/context";
import {
  LanguageModelCore,
  LanguageModel,
  USER_SELECTABLE_LLMS_BY_VENDOR,
  isLanguageModel,
  isOllamaLLM,
  toOllamaModel,
} from "@cocalc/util/db-schema/llm-utils";
import { COLORS } from "@cocalc/util/theme";
import { OllamaPublic } from "@cocalc/util/types/llm";
import { ChatActions } from "./actions";

interface RegenerateLLMProps {
  actions?: ChatActions;
  date: number; // ms since epoch
  style?: CSS;
  model: LanguageModel | false;
}

export function RegenerateLLM({
  actions,
  date,
  style,
  model,
}: RegenerateLLMProps) {
  const { enabledLLMs, project_id } = useProjectContext();
  const selectableLLMs = useTypedRedux("customize", "selectable_llms");
  const ollama = useTypedRedux("customize", "ollama");

  const haveChatRegenerate = redux
    .getStore("projects")
    .hasLanguageModelEnabled(project_id, "chat-regenerate");

  if (!actions || !haveChatRegenerate) return null;

  const entries: MenuProps["items"] = [];

  // iterate over all key,values in USER_SELECTABLE_LLMS_BY_VENDOR
  for (const vendor in USER_SELECTABLE_LLMS_BY_VENDOR) {
    if (!enabledLLMs[vendor]) continue;
    const llms: LanguageModelCore[] = USER_SELECTABLE_LLMS_BY_VENDOR[vendor];
    for (const llm of llms) {
      if (!selectableLLMs.includes(llm)) continue;
      entries.push({
        key: llm,
        label: (
          <>
            <LanguageModelVendorAvatar model={llm} /> {modelToName(llm)}{" "}
            <LLMModelPrice model={llm} floatRight />
          </>
        ),
        onClick: () => {
          actions.regenerateLLMResponse(new Date(date), llm);
        },
      });
    }
  }

  if (ollama && enabledLLMs["ollama"]) {
    for (const [key, config] of Object.entries<OllamaPublic>(ollama.toJS())) {
      const { display = key } = config;
      const ollamaModel = toOllamaModel(key);
      entries.push({
        key: ollamaModel,
        label: (
          <>
            <LanguageModelVendorAvatar model={ollamaModel} /> {display}{" "}
            <LLMModelPrice model={ollamaModel} floatRight />
          </>
        ),
        onClick: () => {
          actions.regenerateLLMResponse(new Date(date), ollamaModel);
        },
      });
    }
  }

  if (entries.length === 0) {
    entries.push({
      key: "none",
      label: "No language models available",
    });
  }

  // list the model that made the response first, to make it easier to regenerate the same response
  // https://github.com/sagemathinc/cocalc/issues/7534
  if (entries.length > 0 && isLanguageModel(model)) {
    entries.unshift({ key: "divider", type: "divider" });
    const display =
      isOllamaLLM(model) && ollama?.get(model) != null
        ? ollama?.getIn([model, "display"]) ?? model
        : modelToName(model);
    entries.unshift({
      key: "same",
      label: (
        <>
          <LanguageModelVendorAvatar model={model} />{" "}
          <Text strong>{display}</Text> (the same){" "}
          <LLMModelPrice model={model} floatRight />
        </>
      ),
      onClick: () => {
        actions.regenerateLLMResponse(new Date(date), model);
      },
    });
  }

  return (
    <Tooltip title="Regenerating the response will send the thread to the language model again and replace this answer. Select a different language model to see, if it has a better response. Previous answers are kept in the history of that message.">
      <Dropdown
        menu={{
          items: entries,
          style: { overflow: "auto", maxHeight: "50vh" },
        }}
        trigger={["click"]}
      >
        <Button
          size="small"
          type="text"
          icon={<Icon name="refresh" />}
          style={{
            display: "inline",
            whiteSpace: "nowrap",
            color: COLORS.GRAY_M,
            ...style,
          }}
        >
          <Space>
            Regenerate
            <Icon name="chevron-down" />
          </Space>
        </Button>
      </Dropdown>
    </Tooltip>
  );
}
